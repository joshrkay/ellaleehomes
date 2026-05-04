#!/usr/bin/env node
import { spawnSync } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function build() {
  const r = spawnSync('node', [path.join(__dirname, 'build-html.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

chokidar
  .watch(['src/**/*.html', 'partials/**/*.html', 'assets/**/*.css'], {
    cwd: root,
    ignoreInitial: true,
  })
  .on('all', (event, p) => {
    console.log(`[watch] ${event} ${p}`);
    build();
  });

console.log('[watch] Watching src/, partials/, assets/ — edit files to rebuild dist/');
build();
