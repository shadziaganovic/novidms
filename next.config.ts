import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js loads worker + wasm assets at runtime; keep it external to the
  // server bundle so OCR works inside server actions / route handlers.
  serverExternalPackages: ["tesseract.js"],
  experimental: {
    serverActions: {
      // Documents (PDF/scans) easily exceed the 1MB default for Server Actions.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
