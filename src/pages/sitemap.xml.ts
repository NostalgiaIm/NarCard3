import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL('https://example.com');
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const urls = [
    { loc: new URL('/', origin).toString(), lastmod: undefined },
    ...posts.map((post) => ({
      loc: new URL(`/blog/${post.id.replace(/\.md$/, '')}/`, origin).toString(),
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString(),
    })),
  ];
  const body = urls.map(({ loc, lastmod }) => `<url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
