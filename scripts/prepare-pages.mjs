import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const output = new URL('../dist/client/', import.meta.url).pathname;
const routes = new Set(['/']);

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '_next' && entry.name !== '.vite') visit(path);
      continue;
    }
    if (!entry.name.endsWith('.html') || entry.name === 'index.html' || entry.name === '404.html') continue;
    const cleanPath = path.slice(0, -'.html'.length);
    const nestedIndex = join(cleanPath, 'index.html');
    mkdirSync(dirname(nestedIndex), { recursive: true });
    copyFileSync(path, nestedIndex);
    const route = `/${relative(output, cleanPath).split('\\').join('/')}/`;
    routes.add(route);
    process.stdout.write(`Prepared ${route}\n`);
  }
}

visit(output);
writeFileSync(join(output, '.nojekyll'), '');

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nicobecodin.github.io').replace(/\/+$/, '');
const escapeXml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...routes].sort().map((route) => `  <url><loc>${escapeXml(`${siteUrl}${route}`)}</loc></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(output, 'sitemap.xml'), sitemap);
writeFileSync(join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap.xml\n`);
