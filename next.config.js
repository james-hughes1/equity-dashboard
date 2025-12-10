/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Optimize webpack for Plotly
  webpack: (config, { isServer }) => {
    // Ignore canvas module (Plotly dependency we don't need)
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    
    // Optimize chunks
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Plotly in its own chunk
          plotly: {
            name: 'plotly',
            test: /[\\/]node_modules[\\/](plotly\.js-basic-dist-min)[\\/]/,
            priority: 10,
            enforce: true,
          },
        },
      };
    }
    
    return config;
  },
  // Increase timeout for dev
  ...(process.env.NODE_ENV === 'development' && {
    experimental: {
      webpackBuildWorker: true,
    },
  }),
}

module.exports = nextConfig