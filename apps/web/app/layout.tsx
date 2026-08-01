import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "@pigment/ui/styles.css";
import "./globals.css";
import "./catalog.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pigment — Color tools for pixel artists",
    template: "%s — Pigment",
  },
  description:
    "Create palette-driven pixel art, study quantization, and browse color systems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
