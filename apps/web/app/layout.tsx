import type { Metadata, Viewport } from "next";
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

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pigment.phil.bingo",
);

export const viewport: Viewport = {
  themeColor: "#11100f",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Pigment",
  title: {
    default: "Pigment — A visual color workshop for artists",
    template: "%s — Pigment",
  },
  description:
    "Transform images, test color ideas, and learn image algorithms in a private browser-based art workshop.",
  keywords: [
    "creative image tools",
    "color palette",
    "image quantization",
    "dithering",
    "browser image editor",
    "artist tools",
  ],
  authors: [{ name: "Phil Zona", url: "https://github.com/pbzona" }],
  creator: "Phil Zona",
  publisher: "Pigment",
  category: "design",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Pigment",
    title: "Pigment — A visual color workshop for artists",
    description:
      "Transform images, test color ideas, and learn image algorithms in a private browser-based art workshop.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pigment — A visual color workshop for artists",
    description:
      "Transform images, test color ideas, and learn image algorithms in a private browser-based art workshop.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
