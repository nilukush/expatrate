import type { APIRoute } from 'astro';
import { sitemapXml, allSiteUrls } from '../lib/seo';

export const GET: APIRoute = () => {
  return new Response(sitemapXml(allSiteUrls()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
