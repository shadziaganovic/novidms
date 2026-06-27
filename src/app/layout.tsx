import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Docorex",
  description: "Multi-tenant DMS — ubaci → nađi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hr">
      <body>{children}</body>
    </html>
  );
}
