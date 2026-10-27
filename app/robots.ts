import type { MetadataRoute } from "next"

// Query-string URLs are the signup flow; crawling them only burns function
// time and Bluesky API calls.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/*?" },
  }
}
