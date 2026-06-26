import type { APIRoute } from 'astro';

/**
 * robots.txt, explicitly welcome AI/search crawlers (the retrieval-eligibility gate).
 * AI answer engines only cite pages they can fetch; this removes any ambiguity.
 * (We intentionally do NOT ship llms.txt, independent crawl logs show AI systems ignore it.)
 */
export const GET: APIRoute = ({ site }) => {
  const origin = (site ?? new URL('https://gflocal.netlify.app')).origin;
  const bots = [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
    'ClaudeBot', 'Claude-Web', 'anthropic-ai',
    'PerplexityBot', 'Perplexity-User',
    'Google-Extended', 'Googlebot', 'Bingbot', 'Applebot', 'Applebot-Extended',
    'CCBot', 'Amazonbot', 'Meta-ExternalAgent', 'DuckAssistBot', 'YouBot', 'cohere-ai',
  ];
  const body = [
    ...bots.flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
