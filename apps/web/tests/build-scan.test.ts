import { describe, expect, it, vi } from "vitest";
import {
  decideBuildPaletteScan,
  getPaletteDirectoryRelativePath,
  isBuildPaletteScanEnabled,
  type BuildScanEnvironment,
  type GitRunner,
  type PaletteBuildState,
} from "@pigment/palette-catalog/server";

const CURRENT_SHA = "a".repeat(40);
const DATABASE_SHA = "b".repeat(40);

function productionEnvironment(): BuildScanEnvironment {
  return {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_GIT_PROVIDER: "github",
    VERCEL_GIT_COMMIT_SHA: CURRENT_SHA,
  };
}

function decide(options: {
  environment?: BuildScanEnvironment;
  buildState?: PaletteBuildState;
  executeGit?: GitRunner;
  forceLocal?: boolean;
}) {
  return decideBuildPaletteScan({
    trackedPaths: ["palettes", "lib/palettes/scan.ts"],
    paletteDirectory: "palettes",
    buildState: options.buildState ?? {
      sourceCommitSha: DATABASE_SHA,
      paletteDirectory: "palettes",
      dirty: false,
    },
    environment: options.environment ?? productionEnvironment(),
    executeGit:
      options.executeGit ?? (() => ({ status: 0, stdout: "" })),
    forceLocal: options.forceLocal,
  });
}

function expected(values: {
  scan: boolean;
  blocked?: boolean;
  reason: string;
  currentSha?: string | null;
  sourceCommitSha?: string | null;
}) {
  return {
    blocked: false,
    currentSha: CURRENT_SHA,
    sourceCommitSha: CURRENT_SHA,
    ...values,
  };
}

describe("palette directory configuration", () => {
  it("normalizes portable project-relative paths", () => {
    expect(getPaletteDirectoryRelativePath("./palettes")).toBe("palettes");
    expect(getPaletteDirectoryRelativePath("assets/palettes")).toBe(
      "assets/palettes",
    );
  });

  it("rejects absolute, escaping, and glob-like paths", () => {
    expect(() => getPaletteDirectoryRelativePath("/tmp/palettes")).toThrow(
      "relative to the project root",
    );
    for (const invalid of [
      "../palettes",
      "assets/../palettes",
      ".",
      "palettes[2026]",
      "palettes/*.png",
    ]) {
      expect(() => getPaletteDirectoryRelativePath(invalid)).toThrow(
        "safe path segments",
      );
    }
  });
});

describe("build palette change detection", () => {
  it("never enables scanning for a Vercel preview", () => {
    const preview = { VERCEL: "1", VERCEL_ENV: "preview" };
    expect(isBuildPaletteScanEnabled(preview, true)).toBe(false);
    const executeGit = vi.fn<GitRunner>();
    expect(
      decide({ environment: preview, executeGit, forceLocal: true }),
    ).toEqual(
      expected({
        scan: false,
        reason: "not a Vercel production build",
        currentSha: null,
        sourceCommitSha: null,
      }),
    );
    expect(executeGit).not.toHaveBeenCalled();
  });

  it("blocks production source uploads that are not clean Git deployments", () => {
    expect(
      decide({
        environment: {
          VERCEL: "1",
          VERCEL_ENV: "production",
          VERCEL_GIT_COMMIT_SHA: CURRENT_SHA,
        },
      }),
    ).toEqual(
      expected({
        scan: false,
        blocked: true,
        reason:
          "production palette synchronization requires a Vercel Git deployment",
        currentSha: null,
        sourceCommitSha: null,
      }),
    );

    expect(
      decide({
        executeGit: (arguments_) => ({
          status: 0,
          stdout:
            arguments_[0] === "status"
              ? " M palettes/metadata.json\n"
              : "",
        }),
      }),
    ).toEqual(
      expected({
        scan: false,
        blocked: true,
        reason: "production palette sources contain uncommitted changes",
      }),
    );

    expect(
      decide({
        executeGit: (arguments_) => ({
          status: arguments_[0] === "status" ? 128 : 0,
          stdout: "",
        }),
      }),
    ).toEqual(
      expected({
        scan: false,
        blocked: true,
        reason: "the production Git working tree could not be verified",
      }),
    );
  });

  it("scans when tracked sources changed from an ancestor revision", () => {
    const executeGit: GitRunner = (arguments_) => ({
      status: arguments_[0] === "diff" ? 1 : 0,
      stdout: "",
    });
    expect(decide({ executeGit })).toEqual(
      expected({
        scan: true,
        reason: "palette sources changed from the database revision",
      }),
    );
  });

  it("skips when the database revision has no palette changes", () => {
    expect(decide({ executeGit: () => ({ status: 0, stdout: "" }) })).toEqual(
      expected({
        scan: false,
        reason: "palette sources are unchanged from the database revision",
      }),
    );
    expect(
      decide({
        buildState: {
          sourceCommitSha: CURRENT_SHA,
          paletteDirectory: "palettes",
          dirty: false,
        },
      }),
    ).toEqual(
      expected({
        scan: false,
        reason: "the target database already contains this Git revision",
      }),
    );
  });

  it("scans a database without a revision or with a changed directory", () => {
    expect(
      decide({
        buildState: {
          sourceCommitSha: null,
          paletteDirectory: null,
          dirty: true,
        },
      }),
    ).toEqual(
      expected({
        scan: true,
        reason: "the target database has no scanned Git revision",
      }),
    );
    expect(
      decide({
        buildState: {
          sourceCommitSha: CURRENT_SHA,
          paletteDirectory: "old-palettes",
          dirty: false,
        },
      }),
    ).toEqual(
      expected({
        scan: true,
        reason: "the configured palette directory changed",
      }),
    );
  });

  it("blocks an older or diverged build from replacing newer data", () => {
    expect(
      decide({
        executeGit: (arguments_) => ({
          status: arguments_[0] === "merge-base" ? 1 : 0,
          stdout: "",
        }),
      }),
    ).toEqual(
      expected({
        scan: false,
        blocked: true,
        reason:
          "the target database revision is not an ancestor of this deployment",
      }),
    );
  });

  it("rescans when another writer marked the catalog dirty", () => {
    expect(
      decide({
        buildState: {
          sourceCommitSha: CURRENT_SHA,
          paletteDirectory: "palettes",
          dirty: true,
        },
      }),
    ).toEqual(
      expected({
        scan: true,
        reason: "the target database catalog was modified outside this build",
      }),
    );
  });

  it("trusts Vercel's previous SHA when shallow history hides ancestry", () => {
    expect(
      decide({
        environment: {
          ...productionEnvironment(),
          VERCEL_GIT_PREVIOUS_SHA: DATABASE_SHA,
        },
        executeGit: (arguments_) => ({
          status:
            arguments_[0] === "status"
              ? 0
              : arguments_[0] === "diff"
                ? 1
                : 128,
          stdout: "",
        }),
      }),
    ).toEqual(
      expected({
        scan: true,
        reason: "palette sources changed from the database revision",
      }),
    );
  });

  it("allows a local scan but never records dirty files as HEAD", () => {
    expect(
      decide({
        environment: {},
        forceLocal: true,
        executeGit: () => ({ status: 0, stdout: CURRENT_SHA }),
      }),
    ).toEqual(
      expected({
        scan: true,
        reason: "a local build scan was requested",
        sourceCommitSha: null,
      }),
    );
    expect(isBuildPaletteScanEnabled({ VERCEL: "1" }, true)).toBe(false);
  });
});
