import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Toaster } from "sonner";
import AttributionCapture from "@/components/AttributionCapture";
import "./globals.css";

// DM Sans via next/font — non-blocking, preloaded, font-display:swap
// Replaces the render-blocking @import url() in globals.css
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CitaCal",
  description: "Attribution-safe scheduling. Every booking, every dollar tracked.",
  openGraph: {
    title: "CitaCal — Attribution-safe scheduling",
    description: "Calendly drops your UTMs and click IDs. CitaCal captures all 10 attribution signals and fires them to your CRM the moment a demo is confirmed.",
    url: "https://citacal.com",
    siteName: "CitaCal",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CitaCal — Every booking, every dollar tracked",
    description: "Stop losing attribution at the booking step. CitaCal preserves gclid, li_fat_id, UTMs through your entire booking flow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${geistMono.variable} antialiased`}>
        {/* Captures UTM params + initializes Mixpanel on every page load */}
        <AttributionCapture />
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
      {/* GA4 — loads the gtag script. Safe to render with placeholder ID */}
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  );
}
