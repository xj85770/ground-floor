import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/**
 * sitemap.xml — full route inventory so crawlers discover every page (retrieval eligibility).
 * Generated at build from the static pages + content collections; lastmod uses experiment dates.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://gflocal.netlify.app')).origin;
  const u = (p: string) => `${origin}${p}`;

  const staticPaths = [
    '/', '/about', '/concepts', '/hardware', '/models',
    '/playbook', '/quickstart', '/scope', '/experiments', '/industries', '/will-it-run/',
  ];

  const experiments = await getCollection('experiments');
  const industries = await getCollection('industries');

  type Entry = { loc: string; lastmod?: string; priority: string };
  const entries: Entry[] = [
    ...staticPaths.map((p) => ({ loc: u(p), priority: p === '/' ? '1.0' : '0.7' })),
    ...experiments.map((e) => ({
      loc: u(`/experiments/${e.slug}`),
      lastmod: e.data.date instanceof Date ? e.data.date.toISOString().slice(0, 10) : undefined,
      priority: '0.8',
    })),
    ...industries.map((i) => ({ loc: u(`/industries/${i.slug}`), priority: '0.6' })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries
      .map(
        (e) =>
          `  <url><loc>${e.loc}</loc>` +
          (e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : '') +
          `<priority>${e.priority}</priority></url>`
      )
      .join('\n') +
    `\n</urlset>\n`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
