import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Tests unitaires de la logique métier uniquement : curation, avantages,
 * résolution de tenant, i18n, géo, thème. Pas de rendu, pas d'E2E en v1.
 */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
