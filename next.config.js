/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Assicurati che le librerie di parsing siano incluse nel bundle server
      config.externals = config.externals || []
      config.externals.push({
        'canvas': 'canvas',
      })
    }
    return config
  }
};

module.exports = nextConfig;
