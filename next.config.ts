import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.discoverblaircounty.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "discoverblaircounty.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.explorealtoona.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "explorealtoona.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
