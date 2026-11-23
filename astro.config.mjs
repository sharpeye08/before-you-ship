// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import rehypeLessonBlocks from './src/lib/rehype-lesson-blocks.mjs';

export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  image: { service: passthroughImageService() },
  markdown: {
    shikiConfig: { theme: 'github-dark-dimmed' },
    rehypePlugins: [rehypeLessonBlocks],
  },
});
