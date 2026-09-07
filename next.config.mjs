/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone keeps the deployed bundle small enough for Hostinger's managed
  // Node app, and keeps the build provider-agnostic (Constitution III).
  output: 'standalone',

  // Vault never receives file bytes (Constitution I). Route bodies carry metadata
  // only; this cap makes a violation fail loudly instead of silently working.
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb',
    },
  },

};

export default nextConfig;
