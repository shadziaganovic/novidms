import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js loads worker + wasm assets at runtime, and exceljs is a large
  // Node-oriented lib; keep both external to the server bundle.
  serverExternalPackages: ["tesseract.js", "exceljs"],
  experimental: {
    serverActions: {
      // Documents (PDF/scans) easily exceed the 1MB default for Server Actions.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
