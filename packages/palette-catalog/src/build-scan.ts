import { spawnSync } from "node:child_process";

import type {
  PaletteDatabase,
  PaletteDatabaseConnection,
} from "./database";

export interface GitCommandResult {
  status: number | null;
  stdout: string;
}

export type GitRunner = (arguments_: string[]) => GitCommandResult;

export interface PaletteBuildState {
  sourceCommitSha: string | null;
  paletteDirectory: string | null;
  dirty: boolean;
}

export interface BuildScanDecision {
  scan: boolean;
  blocked: boolean;
  reason: string;
  currentSha: string | null;
  sourceCommitSha: string | null;
}

export interface BuildScanEnvironment {
  VERCEL?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_PROVIDER?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
  VERCEL_GIT_PREVIOUS_SHA?: string;
}

const GIT_SHA_PATTERN = /^[\da-f]{40,64}$/i;

function getBuildScanEnvironment(): BuildScanEnvironment {
  return {
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_PROVIDER: process.env.VERCEL_GIT_PROVIDER,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    VERCEL_GIT_PREVIOUS_SHA: process.env.VERCEL_GIT_PREVIOUS_SHA,
  };
}

function isGitSha(value: string | null | undefined): value is string {
  return Boolean(value && GIT_SHA_PATTERN.test(value) && !/^0+$/.test(value));
}

export const runGit: GitRunner = (arguments_) => {
  const result = spawnSync("git", arguments_, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
  };
};

function resolveCurrentCommit(
  configuredSha: string | undefined,
  executeGit: GitRunner,
) {
  if (isGitSha(configuredSha)) return configuredSha;
  const result = executeGit(["rev-parse", "--verify", "HEAD"]);
  const sha = result.stdout.trim();
  return result.status === 0 && isGitSha(sha) ? sha : null;
}

export function isBuildPaletteScanEnabled(
  environment: BuildScanEnvironment = getBuildScanEnvironment(),
  forceLocal = false,
) {
  if (environment.VERCEL === "1") {
    return environment.VERCEL_ENV === "production";
  }
  return forceLocal;
}

export async function queryPaletteBuildState(
  database: PaletteDatabaseConnection,
): Promise<PaletteBuildState> {
  await ensurePaletteBuildState(database);
  return readPaletteBuildState(database);
}

async function readPaletteBuildState(
  database: PaletteDatabaseConnection,
): Promise<PaletteBuildState> {
  const result = await database.query<{
    source_commit_sha: string | null;
    palette_directory: string | null;
    dirty: boolean;
  }>(
    `SELECT source_commit_sha, palette_directory, dirty
     FROM palette_build_state
     WHERE id = 1`,
  );
  return {
    sourceCommitSha: result.rows[0]?.source_commit_sha ?? null,
    paletteDirectory: result.rows[0]?.palette_directory ?? null,
    dirty: result.rows[0]?.dirty ?? true,
  };
}

export async function ensurePaletteBuildState(
  database: PaletteDatabaseConnection,
) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS palette_build_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      source_commit_sha TEXT,
      palette_directory TEXT,
      dirty BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE palette_build_state
      ADD COLUMN IF NOT EXISTS dirty BOOLEAN NOT NULL DEFAULT TRUE;

    INSERT INTO palette_build_state (id, dirty)
    VALUES (1, TRUE)
    ON CONFLICT(id) DO NOTHING;

    CREATE OR REPLACE FUNCTION mark_palette_build_state_dirty()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      UPDATE palette_build_state
      SET dirty = TRUE,
          updated_at = NOW()
      WHERE id = 1;
      RETURN NULL;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_palettes_dirty'
          AND tgrelid = 'palettes'::regclass
      ) THEN
        CREATE TRIGGER palette_build_palettes_dirty
        AFTER INSERT OR DELETE OR UPDATE OF
          relative_path, public_id, filename, display_name, mime_type, width,
          height, file_size, mtime_ms, sha256, color_count, unique_color_count,
          average_lightness, min_lightness, max_lightness, average_chroma,
          tags, author_name, author_url, attribution_text, attribution_url,
          attribution_license, popularity, format_version, created_at,
          updated_at, scanned_at
        ON palettes
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_palettes_truncate_dirty'
          AND tgrelid = 'palettes'::regclass
      ) THEN
        CREATE TRIGGER palette_build_palettes_truncate_dirty
        AFTER TRUNCATE ON palettes
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_colors_dirty'
          AND tgrelid = 'palette_colors'::regclass
      ) THEN
        CREATE TRIGGER palette_build_colors_dirty
        AFTER INSERT OR UPDATE OR DELETE ON palette_colors
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_colors_truncate_dirty'
          AND tgrelid = 'palette_colors'::regclass
      ) THEN
        CREATE TRIGGER palette_build_colors_truncate_dirty
        AFTER TRUNCATE ON palette_colors
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_scan_state_dirty'
          AND tgrelid = 'scan_state'::regclass
      ) THEN
        CREATE TRIGGER palette_build_scan_state_dirty
        AFTER INSERT OR UPDATE OR DELETE ON scan_state
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'palette_build_scan_state_truncate_dirty'
          AND tgrelid = 'scan_state'::regclass
      ) THEN
        CREATE TRIGGER palette_build_scan_state_truncate_dirty
        AFTER TRUNCATE ON scan_state
        FOR EACH STATEMENT EXECUTE FUNCTION mark_palette_build_state_dirty();
      END IF;
    END
    $$;
  `);
}

function buildStatesEqual(
  first: PaletteBuildState,
  second: PaletteBuildState,
) {
  return (
    first.sourceCommitSha === second.sourceCommitSha &&
    first.paletteDirectory === second.paletteDirectory &&
    first.dirty === second.dirty
  );
}

export async function advancePaletteBuildState(options: {
  database: PaletteDatabase;
  expected: PaletteBuildState;
  sourceCommitSha: string;
  paletteDirectory: string;
}) {
  const client = await options.database.connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN");
    transactionStarted = true;
    await client.query(`
      SELECT pg_advisory_xact_lock(
        hashtext(current_database()),
        hashtext(COALESCE(current_schema(), '') || ':palette-town-scan')
      )
    `);
    const actual = await readPaletteBuildState(client);
    if (!buildStatesEqual(actual, options.expected)) {
      throw new Error(
        "Palette catalog changed during this build; refusing to advance a stale revision.",
      );
    }
    await client.query(
      `UPDATE palette_build_state
       SET source_commit_sha = $1,
           palette_directory = $2,
           dirty = FALSE,
           updated_at = NOW()
       WHERE id = 1`,
      [options.sourceCommitSha, options.paletteDirectory],
    );
    await client.query("COMMIT");
    transactionStarted = false;
  } catch (error) {
    if (transactionStarted) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function decision(
  values: Omit<BuildScanDecision, "currentSha" | "sourceCommitSha">,
  currentSha: string | null,
  sourceCommitSha: string | null,
): BuildScanDecision {
  return { ...values, currentSha, sourceCommitSha };
}

export function decideBuildPaletteScan(options: {
  trackedPaths: string[];
  paletteDirectory: string;
  buildState: PaletteBuildState;
  environment?: BuildScanEnvironment;
  executeGit?: GitRunner;
  forceLocal?: boolean;
}): BuildScanDecision {
  const environment = options.environment ?? getBuildScanEnvironment();
  const executeGit = options.executeGit ?? runGit;
  const forceLocal = options.forceLocal ?? false;

  if (!isBuildPaletteScanEnabled(environment, forceLocal)) {
    return decision(
      { scan: false, blocked: false, reason: "not a Vercel production build" },
      null,
      null,
    );
  }

  if (environment.VERCEL === "1" && !environment.VERCEL_GIT_PROVIDER) {
    return decision(
      {
        scan: false,
        blocked: true,
        reason: "production palette synchronization requires a Vercel Git deployment",
      },
      null,
      null,
    );
  }

  const currentSha = resolveCurrentCommit(
    environment.VERCEL_GIT_COMMIT_SHA,
    executeGit,
  );
  if (!currentSha) {
    return decision(
      {
        scan: false,
        blocked: true,
        reason: "the current Git commit could not be determined",
      },
      null,
      null,
    );
  }
  if (forceLocal && environment.VERCEL !== "1") {
    return decision(
      { scan: true, blocked: false, reason: "a local build scan was requested" },
      currentSha,
      null,
    );
  }


  const worktree = executeGit([
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...options.trackedPaths,
  ]);
  if (worktree.status !== 0) {
    return decision(
      {
        scan: false,
        blocked: true,
        reason: "the production Git working tree could not be verified",
      },
      currentSha,
      currentSha,
    );
  }
  if (worktree.stdout.trim()) {
    return decision(
      {
        scan: false,
        blocked: true,
        reason: "production palette sources contain uncommitted changes",
      },
      currentSha,
      currentSha,
    );
  }

  const lastScannedSha = options.buildState.sourceCommitSha;
  if (!isGitSha(lastScannedSha)) {
    return decision(
      {
        scan: true,
        blocked: false,
        reason: "the target database has no scanned Git revision",
      },
      currentSha,
      currentSha,
    );
  }

  if (lastScannedSha !== currentSha) {
    const ancestor = executeGit([
      "merge-base",
      "--is-ancestor",
      lastScannedSha,
      currentSha,
    ]);
    const trustedPreviousSha = environment.VERCEL_GIT_PREVIOUS_SHA;
    const ancestryUnavailable = ancestor.status !== 0 && ancestor.status !== 1;
    const trustedShallowBaseline =
      ancestryUnavailable &&
      isGitSha(trustedPreviousSha) &&
      trustedPreviousSha === lastScannedSha;
    if (ancestor.status === 1 || (ancestryUnavailable && !trustedShallowBaseline)) {
      return decision(
        {
          scan: false,
          blocked: true,
          reason:
            "the target database revision is not an ancestor of this deployment",
        },
        currentSha,
        currentSha,
      );
    }
  }

  if (options.buildState.dirty) {
    return decision(
      {
        scan: true,
        blocked: false,
        reason: "the target database catalog was modified outside this build",
      },
      currentSha,
      currentSha,
    );
  }
  if (options.buildState.paletteDirectory !== options.paletteDirectory) {
    return decision(
      {
        scan: true,
        blocked: false,
        reason: "the configured palette directory changed",
      },
      currentSha,
      currentSha,
    );
  }
  if (lastScannedSha === currentSha) {
    return decision(
      {
        scan: false,
        blocked: false,
        reason: "the target database already contains this Git revision",
      },
      currentSha,
      currentSha,
    );
  }

  const diff = executeGit([
    "diff",
    "--quiet",
    lastScannedSha,
    currentSha,
    "--",
    ...options.trackedPaths,
  ]);
  if (diff.status === 0) {
    return decision(
      {
        scan: false,
        blocked: false,
        reason: "palette sources are unchanged from the database revision",
      },
      currentSha,
      currentSha,
    );
  }
  if (diff.status === 1) {
    return decision(
      {
        scan: true,
        blocked: false,
        reason: "palette sources changed from the database revision",
      },
      currentSha,
      currentSha,
    );
  }

  return decision(
    {
      scan: true,
      blocked: false,
      reason: "the palette Git diff could not be determined",
    },
    currentSha,
    currentSha,
  );
}
