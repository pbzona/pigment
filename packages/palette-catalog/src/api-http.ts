import { createHash, timingSafeEqual } from "node:crypto";

export interface ApiFieldError {
  field: string;
  code: string;
  message: string;
}

interface ProblemOptions {
  code: string;
  detail: string;
  errors?: ApiFieldError[];
  headers?: HeadersInit;
}

function appendVary(headers: Headers, value: string) {
  const current = headers.get("Vary");
  const values = new Set(
    current
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
  values.add(value);
  headers.set("Vary", Array.from(values).join(", "));
}

function getAllowedOrigins() {
  return (process.env.PALETTE_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCors(request: Request, headers: Headers) {
  const origin = request.headers.get("Origin");
  if (!origin) return;

  appendVary(headers, "Origin");
  if (!getAllowedOrigins().includes(origin)) return;

  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Expose-Headers", "ETag, Retry-After");
}

function keysMatch(provided: string, expected: string) {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

export function apiProblem(
  request: Request,
  status: number,
  title: string,
  options: ProblemOptions,
) {
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/problem+json");
  applyCors(request, headers);

  return new Response(
    JSON.stringify({
      type: "about:blank",
      title,
      status,
      detail: options.detail,
      instance: new URL(request.url).pathname,
      code: options.code,
      ...(options.errors ? { errors: options.errors } : {}),
    }),
    { status, headers },
  );
}

export function requireApiKey(request: Request) {
  const expected = process.env.PALETTE_API_KEY?.trim();
  if (!expected || expected.length < 32) {
    console.error(
      "Palette Town API is unavailable: PALETTE_API_KEY must contain at least 32 characters.",
    );
    return apiProblem(request, 503, "Service unavailable", {
      code: "api_not_configured",
      detail: "API key authentication is not configured.",
    });
  }

  const authorization = request.headers.get("Authorization");
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  if (!match || !keysMatch(match[1], expected)) {
    return apiProblem(request, 401, "Unauthorized", {
      code: "invalid_api_key",
      detail: "Provide a valid bearer token in the Authorization header.",
      headers: { "WWW-Authenticate": 'Bearer realm="palette-town"' },
    });
  }

  return null;
}

export function apiJson(
  request: Request,
  body: unknown,
  options: { maxAge?: number } = {},
) {
  const json = JSON.stringify(body);
  const etag = `"${createHash("sha256").update(json).digest("base64url")}"`;
  const headers = new Headers({
    "Cache-Control": `private, max-age=${options.maxAge ?? 60}, must-revalidate`,
    "Content-Type": "application/json; charset=utf-8",
    ETag: etag,
  });
  appendVary(headers, "Authorization");
  applyCors(request, headers);

  const validators = (request.headers.get("If-None-Match") ?? "")
    .split(",")
    .map((value) => value.trim());
  if (
    validators.some(
      (validator) =>
        validator === "*" ||
        validator === etag ||
        validator.replace(/^W\//, "") === etag,
    )
  ) {
    headers.delete("Content-Type");
    return new Response(null, { status: 304, headers });
  }

  return new Response(json, { headers });
}

export function apiOptions(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && !getAllowedOrigins().includes(origin)) {
    return apiProblem(request, 403, "Forbidden", {
      code: "origin_not_allowed",
      detail: "This origin is not allowed to access the API.",
    });
  }

  const headers = new Headers({
    Allow: "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, If-None-Match",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "private, max-age=86400",
  });
  applyCors(request, headers);
  return new Response(null, { status: 204, headers });
}
