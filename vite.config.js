import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { courses } from './src/data/courses.js';
import { teachers } from './src/data/teachers.js';
import { pageMeta } from './src/data/routes.js';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/heeva-frontend/',
  plugins: [
    react(),
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
