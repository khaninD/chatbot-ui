// Conditionally require dev dependencies only if available
let withBundleAnalyzer = config => config
let withPWA = config => config

try {
  withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true"
  })
} catch (e) {
  // @next/bundle-analyzer not installed (production build)
}

try {
  withPWA = require("next-pwa")({
    dest: "public"
  })
} catch (e) {
  // next-pwa not installed (production build)
}

module.exports = withBundleAnalyzer(
  withPWA({
    reactStrictMode: true,
    images: {
      unoptimized: true,
      remotePatterns: [
        {
          protocol: "http",
          hostname: "localhost"
        },
        {
          protocol: "http",
          hostname: "127.0.0.1"
        },
        {
          protocol: "https",
          hostname: "**"
        }
      ]
    },
    serverExternalPackages: [
      "sharp",
      "onnxruntime-node",
      "pdf-parse",
      "canvas",
      "@langchain/core",
      "@langchain/textsplitters",
      "langchain",
      "@llamaindex/openai",
      "@llamaindex/tools",
      "@llamaindex/workflow",
      "@llamaindex/core",
      "@modelcontextprotocol/sdk",
      "ajv",
      "ajv-draft-04",
      "@apidevtools/swagger-parser"
    ],
    turbopack: {},
    webpack: (config, { isServer }) => {
      if (isServer) {
        // Exclude native modules from webpack bundling on server
        config.externals.push({
          sharp: "commonjs sharp",
          "pdf-parse": "commonjs pdf-parse",
          canvas: "commonjs canvas",
          "@llamaindex/openai": "commonjs @llamaindex/openai",
          "@llamaindex/tools": "commonjs @llamaindex/tools",
          "@llamaindex/workflow": "commonjs @llamaindex/workflow",
          "@llamaindex/core": "commonjs @llamaindex/core",
          "@modelcontextprotocol/sdk": "commonjs @modelcontextprotocol/sdk"
        })
      }

      // Ignore pdfjs-dist worker files in webpack
      config.module = config.module || {}
      config.module.rules = config.module.rules || []
      config.module.rules.push({
        test: /\.node$/,
        use: "node-loader"
      })

      // Resolve pdfjs-dist properly
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false
      }

      return config
    }
  })
)
