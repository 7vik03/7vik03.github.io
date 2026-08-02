import { defineConfig } from 'astro/config';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// GitHub Pages: if this repo is `7vik03.github.io`, leave `base` out.
// If it is a project repo (e.g. `7vik03/site`), set base: '/site'.
export default defineConfig({
  site: 'https://7vik03.github.io',
  trailingSlash: 'ignore',
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
  },
});
