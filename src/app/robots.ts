import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/register', '/privacy-policy', '/terms-conditions', '/refund-policy', '/contact'],
      disallow: ['/dashboard/', '/admin/', '/api/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://pvccardpro.com'}/sitemap.xml`,
  }
}
