import type { NextConfig } from "next";

function storageImagePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "https", hostname: "**.amazonaws.com" },
    { protocol: "https", hostname: "**.cloudfront.net" },
    // Existing beats still have Cloudinary cover URLs after the S3 migration.
    { protocol: "https", hostname: "res.cloudinary.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
    { protocol: "https", hostname: "img.youtube.com" },
  ];

  const publicUrl = process.env.AWS_S3_PUBLIC_URL;
  if (!publicUrl) return patterns;

  try {
    const { hostname, protocol } = new URL(publicUrl);
    if (protocol === "https:" || protocol === "http:") {
      patterns.unshift({
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
      });
    }
  } catch {
    // Invalid public URL is ignored; S3/CloudFront wildcards still apply.
  }

  return patterns;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.0.101",
  ],

  images: {
    remotePatterns: storageImagePatterns(),
  },

  async redirects() {
    return [
      {
        source: "/p/:username",
        destination: "/producer/:username",
        permanent: true,
      },
    ];
  },

  async headers() {
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://checkout.razorpay.com",
      "img-src 'self' data: blob: https://www.googletagmanager.com https://www.google-analytics.com https://www.facebook.com https://*.amazonaws.com https://*.cloudfront.net https://res.cloudinary.com https://lh3.googleusercontent.com https://img.youtube.com",
      "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://www.facebook.com https://lumberjack-cx.razorpay.com https://api.razorpay.com",
      "frame-src https://www.googletagmanager.com https://api.razorpay.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "media-src 'self' blob: https://*.amazonaws.com https://*.cloudfront.net",
    ];

    const baseHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      { key: "X-XSS-Protection", value: "1; mode=block" },
    ];

    function securityHeaders(frameAncestors?: string) {
      const csp = frameAncestors
        ? [...cspDirectives, `frame-ancestors ${frameAncestors}`]
        : cspDirectives;
      return [
        ...baseHeaders,
        { key: "Content-Security-Policy", value: csp.join("; ") },
      ];
    }

    return [
      {
        source: "/((?!embed).*)",
        headers: [
          ...securityHeaders(),
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
      {
        source: "/embed/:path*",
        headers: securityHeaders("*"),
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;