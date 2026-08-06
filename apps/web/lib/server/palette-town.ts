import "server-only";

export class PaletteTownError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter: string | null = null,
  ) {
    super(message);
  }
}

export async function fetchPaletteTown(
  pathname: string,
  searchParams?: URLSearchParams,
  validate: (body: unknown) => boolean = () => true,
): Promise<unknown> {
  const baseUrl = process.env.PALETTE_TOWN_URL?.trim();
  const apiKey = process.env.PALETTE_TOWN_API_KEY?.trim();
  if (!baseUrl || !apiKey || apiKey.length < 32) {
    throw new PaletteTownError("Palette Town is not configured.", 503);
  }

  let url: URL;
  try {
    url = new URL(pathname, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  } catch {
    throw new PaletteTownError("Palette Town is not configured.", 503);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PaletteTownError("Palette Town is not configured.", 503);
  }
  if (searchParams) url.search = searchParams.toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
  } catch {
    throw new PaletteTownError("Palette Town could not be reached.", 503);
  }

  if (!response.ok) {
    const status =
      response.status === 429 ? 429 : response.status === 400 ? 400 : 503;
    throw new PaletteTownError(
      status === 429
        ? "Palette Town is temporarily rate limited."
        : "Palette Town is unavailable.",
      status,
      response.headers.get("Retry-After"),
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new PaletteTownError("Palette Town returned invalid data.", 502);
  }
  if (!validate(body)) {
    throw new PaletteTownError("Palette Town returned invalid data.", 502);
  }
  return body;
}
