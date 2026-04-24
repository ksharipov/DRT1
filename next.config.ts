import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['duckdb'],
  outputFileTracingExcludes: {
    '*': ['data/**'],
  },
  turbopack: {
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '.css'],
    rules: {
      'data/*.ddb': { loaders: [] },
      'data/*.wal': { loaders: [] },
    },
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
        path.resolve('./data'),
      ],
    }
    return config
  },
}

export default nextConfig
