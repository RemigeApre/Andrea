import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://simonet-davin.fr',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: false,
  },
  integrations: [sitemap({
    filter: (page) => !page.includes('/admin') && !page.includes('/patient') && !page.includes('/connexion') && !page.includes('/deconnexion'),
  })],
});
