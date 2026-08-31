import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://expatrate.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
  server: { port: 4573 },
  preview: { port: 4574 },
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
});
