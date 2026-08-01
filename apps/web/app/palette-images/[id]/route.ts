import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { parsePaletteId } from "@pigment/palette-catalog";
import {
  getDatabase,
  getPaletteDirectory,
  queryPaletteImageById,
} from "@pigment/palette-catalog/server";


export const runtime = "nodejs";

function notFound() {
  return new Response("Palette image not found", { status: 404 });
}

function encodeHeaderFilename(filename: string) {
  return encodeURIComponent(filename).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const paletteId = parsePaletteId(id);
  if (paletteId === null) return notFound();

  const record = await queryPaletteImageById(await getDatabase(), paletteId);
  if (!record) return notFound();

  try {
    const root = await realpath(getPaletteDirectory());
    const filePath = await realpath(path.resolve(root, record.relativePath));
    const relativeToRoot = path.relative(root, filePath);
    if (
      relativeToRoot.startsWith("..") ||
      path.isAbsolute(relativeToRoot)
    ) {
      return notFound();
    }

    const image = await readFile(filePath);
    const liveSha256 = createHash("sha256").update(image).digest("hex");
    const url = new URL(request.url);
    const versioned =
      url.searchParams.get("v") === record.sha256 &&
      liveSha256 === record.sha256;
    const etag = `"${liveSha256}"`;
    const cacheControl = versioned
      ? "public, max-age=31536000, immutable"
      : "private, max-age=0, must-revalidate";

    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: { ETag: etag, "Cache-Control": cacheControl },
      });
    }

    const headers = new Headers({
      "Cache-Control": cacheControl,
      "Content-Length": String(image.byteLength),
      "Content-Type": record.mimeType,
      ETag: etag,
    });

    if (liveSha256 !== record.sha256) {
      headers.set("X-Palette-Index-Stale", "true");
    }

    if (url.searchParams.get("download") === "1") {
      const safeFilename = record.filename.replace(/["\r\n]/g, "_");
      headers.set(
        "Content-Disposition",
        `attachment; filename="${safeFilename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeHeaderFilename(record.filename)}`,
      );
    }

    return new Response(new Uint8Array(image), { headers });
  } catch {
    return notFound();
  }
}
