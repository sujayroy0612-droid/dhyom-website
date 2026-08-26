/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: {
    "/api/notify-order": ["./node_modules/pdfkit/**/*"],
  },
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "pdfkit"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js + Razorpay popup need unsafe-inline; Razorpay script is external
      "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com",
      // framer-motion and Tailwind runtime class generation need unsafe-inline; Google Fonts stylesheet
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // product images from Cloudinary; Razorpay may load its own logo
      "img-src 'self' data: blob: https://res.cloudinary.com https://*.razorpay.com",
      // Next.js self-hosted fonts + Google Fonts (Cinzel, Cormorant Garamond)
      "font-src 'self' data: https://fonts.gstatic.com",
      // Supabase (REST + realtime websocket) + Razorpay API
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com",
      // Razorpay payment modal is an iframe inside the page
      "frame-src https://*.razorpay.com",
      // Nobody should be able to embed dhyom.in in an iframe (clickjacking)
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options",    value: "nosniff" },
          // Clickjacking fallback for older browsers (CSP frame-ancestors is primary)
          { key: "X-Frame-Options",           value: "DENY" },
          // Only send origin (no path) in Referer header to external sites
          { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
          // Disable browser features we don't need
          { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy",   value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
