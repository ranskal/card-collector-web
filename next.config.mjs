// next.config.mjs
import withPWAInit from 'next-pwa'

const isProd = process.env.NODE_ENV === 'production'

const withPWA = withPWAInit({
  dest: 'public',
  disable: !isProd, // enable PWA only in prod
})

const nextConfig = {
  reactStrictMode: true,
  images: {
    // ⬇️ Turn off Vercel Image Optimization (stops the transform billing)
    unoptimized: true,
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default withPWA(nextConfig)