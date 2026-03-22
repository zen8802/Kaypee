import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resolution Arbitrage Engine",
  description: "Find mispriced prediction market contracts using AI resolution analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg-primary text-gray-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}
