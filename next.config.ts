import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@duckdb/duckdb-wasm'],
  outputFileTracingExcludes: {
    '*': ['data/**'],
  },
  outputFileTracingIncludes: {
    '/api/query': [
      './node_modules/@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm',
      './node_modules/@duckdb/duckdb-wasm/dist/duckdb-eh.wasm',
      './node_modules/@duckdb/duckdb-wasm/dist/duckdb-node-mvp.worker.cjs',
      './node_modules/@duckdb/duckdb-wasm/dist/duckdb-node-eh.worker.cjs',
      './node_modules/@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs',
    ],
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
