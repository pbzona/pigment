# @pigment/web

The unified Pigment Next.js application.

## Routes

- `/` Pigment home
- `/studio` Pigment image-to-pixel editor
- `/learn` interactive quantization guide
- `/palettes` palette catalog
- `/api/v1/*` authenticated public palette API
- `/api/palettes` and `/api/palette-tags` browser BFF endpoints

## Development

```bash
pnpm --filter @pigment/web dev
```

Set `DATABASE_URL`, `PALETTE_DIRECTORY`, `PALETTE_API_KEY`, and
`PALETTE_API_ALLOWED_ORIGINS` as documented in `.env.example`. The Palette Town
browser proxy additionally requires `PALETTE_TOWN_URL` and the server-only
`PALETTE_TOWN_API_KEY` used by that service.

Use `pnpm --filter @pigment/web palettes:scan` to index PNG sources from
`palettes/`.
