import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   allowedDevOrigins: ["192.168.0.101"],
//   images: {
//     remotePatterns: [
//       {
//         protocol: "https",
//         hostname: "res.cloudinary.com",
//       },
//     ],
//   },
// };

// export default nextConfig;





const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.101"],
  
  // ✅ YE ADD KAR - file upload ke liye zaroori hai
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;