import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { courses } from './src/data/courses.js';
import { teachers } from './src/data/teachers.js';
import { pageMeta } from './src/data/routes.js';
import { defineConfig } from 'vite';

// Cloudflare Workers serves assets from the origin root. GitHub Pages opts into its repo prefix explicitly.
const siteBase = process.env.HEEVA_BASE_PATH || '/';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: siteBase,
  plugins: [
    react(),
    {
      name: 'rewrite-preview-paths-for-root-domain',
      apply: 'build',
      generateBundle(_options, bundle) {
        if (siteBase !== '/') return;
        for (const output of Object.values(bundle)) {
          if (output.type === 'chunk') {
            output.code = output.code.replaceAll('/heeva-frontend/', '/');
          } else if (typeof output.source === 'string') {
            output.source = output.source.replaceAll('/heeva-frontend/', '/');
          }
        }
      },
    },
    {
      name: 'pages-route-entries',
      apply: 'build',
      async writeBundle({ dir }) {
        // Give each public route an index so Pages can serve a direct visit.
        const routes = [
          ...Object.keys(pageMeta).filter((route) => route !== '/'),
          ...courses.map(({ slug }) => `/courses/${slug}`),
          ...teachers.map(({ slug }) => `/teachers/${slug}`),
        ];
        await Promise.all(routes.map(async (route) => {
          const target = join(dir, route.slice(1));
          await mkdir(target, { recursive: true });
          await copyFile(join(dir, 'index.html'), join(target, 'index.html'));
        }));
      },
    },
  ],
});
