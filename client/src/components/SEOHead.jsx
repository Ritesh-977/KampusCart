import { Helmet } from 'react-helmet-async';

const BASE_URL = 'https://www.kampuscart.site';
const DEFAULT_IMAGE = `${BASE_URL}/og-image.jpg`;
const DEFAULT_TITLE = 'KampusCart – Campus Marketplace for Students';
const DEFAULT_DESC =
  'The exclusive marketplace for college students. Buy and sell books, electronics, and dorm essentials securely within your campus.';

/**
 * SEOHead — drop into any page to set dynamic meta tags, Open Graph, Twitter
 * Card, canonical URL, and optional JSON-LD structured data.
 *
 * Props:
 *   title        {string}  Page <title> (55-60 chars recommended)
 *   description  {string}  Meta description (150-160 chars recommended)
 *   url          {string}  Canonical URL for this page
 *   imageUrl     {string}  OG/Twitter image (absolute URL)
 *   type         {string}  OG type — 'website' | 'product' | 'article'
 *   structuredData {object} Raw JSON-LD object, injected as <script type="application/ld+json">
 */
export default function SEOHead({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESC,
  url,
  imageUrl = DEFAULT_IMAGE,
  type = 'website',
  structuredData,
}) {
  const canonical = url || BASE_URL;

  // Truncate to safe limits to avoid Google warnings
  const safeTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
  const safeDesc =
    description.length > 160 ? description.substring(0, 157) + '...' : description;

  return (
    <Helmet>
      {/* Primary */}
      <title>{safeTitle}</title>
      <meta name="description" content={safeDesc} />
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={safeTitle} />
      <meta property="og:description" content={safeDesc} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="KampusCart" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonical} />
      <meta name="twitter:title" content={safeTitle} />
      <meta name="twitter:description" content={safeDesc} />
      <meta name="twitter:image" content={imageUrl} />

      {/* JSON-LD Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
