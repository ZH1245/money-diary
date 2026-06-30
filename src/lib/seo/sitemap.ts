import { SITEMAP_PATHS } from '#/lib/seo/public-seo'
import { getSiteUrl } from '#/lib/seo/site-url'

/**
 * Builds sitemap XML for public marketing and auth entry pages.
 */
export function buildSitemapXml(): string {
  const siteUrl = getSiteUrl()
  const lastmod = new Date().toISOString().slice(0, 10)

  const urls = SITEMAP_PATHS.map((path) => {
    const loc = path === '/' ? siteUrl : `${siteUrl}${path}`
    const priority = path === '/' ? '1.0' : '0.8'
    const changefreq = path === '/' ? 'weekly' : 'monthly'

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  }).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
