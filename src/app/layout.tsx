import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SnapLink — URL Shortener",
  description: "Rut gon URL nhanh chong, theo doi luot click, chia se de dang.",
  keywords: ["url shortener", "rut gon link", "short url"],
  openGraph: {
    title: "SnapLink — URL Shortener",
    description: "Rut gon URL nhanh chong, theo doi luot click",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}