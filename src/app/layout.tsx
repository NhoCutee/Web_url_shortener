import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapLink — URL Shortener",
  description: "Private Redirect Service.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
