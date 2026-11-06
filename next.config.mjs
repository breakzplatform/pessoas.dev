/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.bsky.app",
        pathname: "/img/**",
      },
    ],
  },
  // The FAQ moved to a section of the home page. Redirects run before the
  // proxy, so the first rule covers the real domains and the second the
  // /{domain}/... paths used on localhost and previews.
  async redirects() {
    return [
      { source: "/perguntas", destination: "/#perguntas", statusCode: 301 },
      {
        source: "/:domain(pessoas\\.dev|ceuazul\\.online)/perguntas",
        destination: "/:domain#perguntas",
        statusCode: 301,
      },
    ]
  },
}

export default nextConfig
