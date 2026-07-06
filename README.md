# Cursor chat landing page

A single-page personal site styled like a Cursor chat window. Text streams in
as if an agent just answered "who is your name?"

## Make it yours

Everything personal lives in two places:

1. **`src/pages/Home.tsx`** — the chat prompt, transcript, links, and headshot
   alt text. Search for `Your Name`, `Your Title`, `Your City`, and
   `yourhandle`, then replace them.
2. **`index.html`** — page title, description, author, and social meta tags.

Swap `public/headshot.png` for your portrait (square crops look best). Optionally
replace `public/favicon.png`.

Add or remove list items in the `response` array in `Home.tsx` for extra links.

## Run locally

```bash
npm install
npm run dev
```

Build with `npm run build`. Preview with `npm run preview`.

## Deploy

`netlify.toml` builds with `npm run build` and publishes `dist`. Point any static
host at that output directory.
