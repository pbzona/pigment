# Pigment

![A goofy pixel pig surrounded by Pigment color swatches](assets/pigment-pig.svg)

Pigment is a pixel-art color workshop. One Next.js app, `@pigment/web`, serves the interactive studio at `/studio`, hands-on color lessons at `/learn`, and the searchable palette catalog at `/palettes`.

Image decoding, sampling, quantization, and rendering happen locally in the browser: uploaded images are not sent to a processing service. Studio palettes can be extracted from an image, edited and reordered, adjusted in perceptual color space, or loaded from the catalog. Palette edits immediately re-render the preview and remain local unless explicitly exported.

## Workspace

- `apps/web` - `@pigment/web`, the unified Next.js application
- `packages/color` - `@pigment/color`, color parsing, conversion, and adjustment
- `packages/palette` - `@pigment/palette`, palette models and editing operations
- `packages/quantization` - `@pigment/quantization`, browser-side image reduction and rendering
- `packages/palette-catalog` - `@pigment/palette-catalog`, palette scanning, metadata, queries, and persistence
- `packages/ui` - `@pigment/ui`, shared React components and styles

## Development

Requires Node.js 20.9 or newer and pnpm 9.

```bash
pnpm install
pnpm dev
```

Turbo runs workspace tasks from the repository root:

```bash
pnpm build
pnpm lint
pnpm check-types
pnpm test
pnpm test:integration
pnpm format
```

Run a task only for the web app with `pnpm turbo run <task> --filter=@pigment/web`.

## Configuration

Create `apps/web/.env.local` as needed. Never commit secret values.

| Variable                      | Purpose                                                        |
| ----------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`        | Canonical production origin for metadata, robots, and sitemap  |
| `DATABASE_URL`                | PostgreSQL connection used by the palette catalog              |
| `PALETTE_DIRECTORY`           | Portable repository-relative directory containing palette PNGs |
| `PALETTE_API_KEY`             | Bearer token for protected palette API access                  |
| `PALETTE_API_ALLOWED_ORIGINS` | Optional comma-separated CORS origin allowlist                 |

The catalog creates its tables on first connection. `PALETTE_DIRECTORY` defaults to `palettes` and cannot point outside the project.

## Palettes

Scan palette files during local development or synchronize the catalog using the build-safe workflow:

```bash
pnpm --filter @pigment/web palettes:scan
pnpm turbo run palettes:sync --filter=@pigment/web
```

The scanner reads palette-strip PNGs and metadata, validates a maximum of 64 colors, and reconciles catalog records. Production synchronization is intended for the Vercel Git build and uses Vercel's commit environment to choose an incremental or full scan.

## Testing

`pnpm test` runs the database-independent Vitest suites through Turbo. Set `DATABASE_URL` and run `pnpm test:integration` for the PostgreSQL migration and scanner suite. Use `pnpm --filter @pigment/web test` for the app or `pnpm --filter @pigment/color test` (and the equivalent package name) for one library.

## Deploying

Create a Vercel project from this repository and set **Root Directory** to `apps/web`. Enable Vercel system environment variables, configure the required variables above for each environment, and use the standard build command.
