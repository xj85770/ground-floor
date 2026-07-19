/**
 * seo.ts, Schema.org / JSON-LD builders for agent-SEO (GEO).
 *
 * Goal: make Ground Floor content easy for AI agents to retrieve, select, cite, and trust.
 * Every builder emits ONLY verified facts already present on the public site (footer links,
 * published copy). No new throughput, compliance, or config claims are introduced here.
 */

export const SITE = {
  name: 'Ground Floor',
  /** Short, entity-restated description used as the canonical definition atom. */
  tagline: 'Local AI for sensitive professional work.',
  description:
    'Ground Floor is an independent education and field-testing project that helps small professional practices evaluate local, open-weight AI for narrow documentation tasks under human review.',
} as const;

type JsonLd = Record<string, unknown>;

/** Absolute URL helper bound to the site origin. */
export function abs(site: URL | string | undefined, path: string): string {
  const origin = (site ? new URL(site).origin : 'https://gflocal.netlify.app');
  return new URL(path, origin).href;
}

/** The Organization entity, the trust anchor every page binds citations to. */
export function organization(site: URL | string | undefined): JsonLd {
  return {
    '@type': 'Organization',
    '@id': abs(site, '/#org'),
    name: SITE.name,
    url: abs(site, '/'),
    description: SITE.description,
    creator: { '@id': abs(site, '/#org') },
  };
}

/** The WebSite entity. */
export function website(site: URL | string | undefined): JsonLd {
  return {
    '@type': 'WebSite',
    '@id': abs(site, '/#website'),
    name: SITE.name,
    url: abs(site, '/'),
    description: SITE.description,
    publisher: { '@id': abs(site, '/#org') },
    inLanguage: 'en',
  };
}

/** A datable article/experiment write-up. */
export function article(opts: {
  site: URL | string | undefined;
  path: string;
  headline: string;
  description: string;
  datePublished?: Date | string;
  dateModified?: Date | string;
  techArticle?: boolean;
  about?: string[];
}): JsonLd {
  const d = (v?: Date | string) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : v;
  const o: JsonLd = {
    '@type': opts.techArticle ? 'TechArticle' : 'Article',
    '@id': abs(opts.site, opts.path) + '#article',
    headline: opts.headline,
    description: opts.description,
    url: abs(opts.site, opts.path),
    author: { '@id': abs(opts.site, '/#org') },
    publisher: { '@id': abs(opts.site, '/#org') },
    isPartOf: { '@id': abs(opts.site, '/#website') },
  };
  if (opts.datePublished) o.datePublished = d(opts.datePublished);
  o.dateModified = d(opts.dateModified ?? opts.datePublished);
  if (opts.about?.length) o.about = opts.about.map((name) => ({ '@type': 'Thing', name }));
  return o;
}

/** A FAQ block, pairs with the visible <Faq> component to cover decomposed sub-queries. */
export function faqPage(items: { q: string; a: string }[]): JsonLd {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** A generic typed page node (AboutPage / WebPage / CollectionPage / etc.). */
export function page(
  type: string,
  opts: { site: URL | string | undefined; path: string; name: string; description: string }
): JsonLd {
  return {
    '@type': type,
    '@id': abs(opts.site, opts.path) + '#page',
    name: opts.name,
    description: opts.description,
    url: abs(opts.site, opts.path),
    isPartOf: { '@id': abs(opts.site, '/#website') },
    publisher: { '@id': abs(opts.site, '/#org') },
  };
}

/** A canonical definition for an entity/term (ambient layer, own the definition). */
export function definedTerm(name: string, description: string, site?: URL | string): JsonLd {
  return {
    '@type': 'DefinedTerm',
    name,
    description,
    inDefinedTermSet: { '@type': 'DefinedTermSet', name: 'Ground Floor, local AI for regulated work', url: abs(site, '/concepts') },
  };
}

/** Breadcrumbs aid retrieval + position signals. */
export function breadcrumb(site: URL | string | undefined, trail: { name: string; path: string }[]): JsonLd {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: abs(site, t.path),
    })),
  };
}

/** A dataset/leaderboard (model or hardware tables are citation magnets). */
export function dataset(opts: {
  site: URL | string | undefined; path: string; name: string; description: string;
}): JsonLd {
  return {
    '@type': 'Dataset',
    '@id': abs(opts.site, opts.path) + '#dataset',
    name: opts.name,
    description: opts.description,
    url: abs(opts.site, opts.path),
    creator: { '@id': abs(opts.site, '/#org') },
    isAccessibleForFree: true,
  };
}

/**
 * Wrap one or more JSON-LD nodes into a single @graph document.
 * Organization + WebSite are always present so every page binds to the entity.
 */
export function graph(site: URL | string | undefined, nodes: JsonLd[]): string {
  const doc = {
    '@context': 'https://schema.org',
    '@graph': [
      organization(site),
      website(site),
      ...nodes,
    ],
  };
  return JSON.stringify(doc);
}
