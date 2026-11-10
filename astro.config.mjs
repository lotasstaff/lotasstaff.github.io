import { defineConfig } from 'astro/config';

// 元サイトのURL(shaken_29.html 形式)を維持するため build.format は 'file'
export default defineConfig({
  site: 'https://www.lotas-asahi.com',
  build: { format: 'file' },
  trailingSlash: 'ignore',
});
