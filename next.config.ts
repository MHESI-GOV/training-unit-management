import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route reads the session (cookies/auth) — this app has no static/content
  // pages that would benefit from Cache Components' prerender split.
  experimental: {
    serverActions: {
      // Default is 1MB. Unit photos are capped at 3MB (MAX_FILE_BYTES in unit/profile/actions.ts);
      // this leaves room for the multipart overhead and stays under Vercel's 4.5MB request limit.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
