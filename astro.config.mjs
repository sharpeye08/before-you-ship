// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import rehypeLessonBlocks from './src/lib/rehype-lesson-blocks.mjs';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  image: { service: passthroughImageService() },
  // React for interactive parts of new pages. Tailwind only runs on CSS files that import it.
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
    rehypePlugins: [rehypeLessonBlocks],
  },
});
