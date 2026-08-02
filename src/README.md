# sathvik.dev — Astro

Same terminal design as before, now with a blog. Nothing about the visual design
changed: the homepage is a 1:1 port of the old single-file `index.html`.

## Run it

```sh
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
```

## Writing a post

Drop a markdown file in `src/content/posts/`. The filename becomes the URL:
`src/content/posts/my-post.md` → `/posts/my-post/`.

```md
---
title: "Why sparse tensor kernels stall on Apple Silicon"
date: 2026-07-14
description: "Optional — used for SEO and the RSS feed."
draft: false          # optional; true hides it everywhere
---

Body starts here. `##` and `###` headings automatically become the
left-hand outline on the post page.
```

Supported out of the box: fenced code blocks with syntax highlighting (light and
dark themes both wired), tables, images, footnotes (`[^1]`), blockquotes, and
LaTeX — `$inline$` and `$$display$$`.

New posts appear in the **Posts** section of the homepage (newest first) and in
`/rss.xml` with no other edits.

## Layout

```
src/
  content/posts/*.md        <- your writing lives here, nothing else
  content.config.ts         <- frontmatter schema
  layouts/Terminal.astro    <- title bar, screen, TOC, theme + accent
  components/Section.astro  <- the ┌─ Title ─┐ ASCII box
  pages/index.astro         <- homepage content
  pages/posts/[...slug].astro
  pages/rss.xml.js
  styles/terminal.css       <- all styling
  scripts/terminal.js       <- ASCII morph, theme toggle, palette, scroll-spy
```

Put `resume.pdf` (and any post images) in `public/`.

## Deploy — GitHub Pages

1. Move `site/*` to the root of your repo (or keep the folder and point the
   workflow at it with `withastro/action`'s `path: site` input).
2. Copy `.github/workflows/deploy.yml` to the repo root's `.github/workflows/`.
3. Repo → Settings → Pages → Source: **GitHub Actions**.
4. If the repo is *not* named `7vik03.github.io`, add `base: '/<repo-name>'` to
   `astro.config.mjs`.

Push to `main` and it builds and publishes itself.
