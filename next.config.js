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
    experimental: {
      serverComponentsExternalPackages: ["sharp", "onnxruntime-node"]
    }
  })
)
