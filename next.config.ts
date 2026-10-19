import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route reads the session (cookies/auth) — this app has no static/content
  // pages that would benefit from Cache Components' prerender split.
};

export default nextConfig;
