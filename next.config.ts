// import type { NextConfig } from "next";

// // const nextConfig: NextConfig = {
// //   allowedDevOrigins: ["192.168.0.101"],
// //   images: {
// //     remotePatterns: [
// //       {
// //         protocol: "https",
// //         hostname: "res.cloudinary.com",
// //       },
// //     ],
// //   },
// // };

// // export default nextConfig;



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





import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.101"],
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