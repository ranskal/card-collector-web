// next.config.mjs
import createPWA from 'next-pwa'

const withPWA = createPWA({
  dest: 'public',
  // disable SW in dev so HMR works nicely
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig = {
  reactStrictMode: true,
}

export default withPWA(nextConfig)