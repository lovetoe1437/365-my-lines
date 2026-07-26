// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  security: {
    // Cloudflare can expose a different internal request origin to Astro on iOS Safari.
    // The middleware performs the equivalent trusted-origin check with the public domains.
    checkOrigin: false,
  },

  adapter: cloudflare({
    imageService: 'passthrough'
  })
});
