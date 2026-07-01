import { getClientSiteUrl, SITE_NAME } from '#/lib/seo/public-seo'

interface LandingJsonLdProps {
  description: string
}

/** Structured data for the public marketing homepage. */
export function LandingJsonLd({ description }: LandingJsonLdProps) {
  const siteUrl = getClientSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: SITE_NAME,
        description,
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#app`,
        name: SITE_NAME,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Web',
        description,
        url: siteUrl,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
