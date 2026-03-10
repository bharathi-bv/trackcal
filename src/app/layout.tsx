import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import AttributionCapture from "@/components/AttributionCapture";
import { createServerClient } from "@/lib/supabase";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID ?? null;
  let googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID ?? null;
  let metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null;
  let linkedinPartnerId = process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID ?? null;

  try {
    const db = createServerClient();
    const { data: hostSettings } = await db
      .from("host_settings")
      .select("google_analytics_id, google_tag_manager_id, meta_pixel_id, linkedin_partner_id")
      .limit(1)
      .maybeSingle();

    googleAnalyticsId = hostSettings?.google_analytics_id ?? googleAnalyticsId;
    googleTagManagerId = hostSettings?.google_tag_manager_id ?? googleTagManagerId;
    metaPixelId = hostSettings?.meta_pixel_id ?? metaPixelId;
    linkedinPartnerId = hostSettings?.linkedin_partner_id ?? linkedinPartnerId;
  } catch (error) {
    console.warn("[layout] failed to load analytics IDs:", error);
  }

  return (
    <ClerkProvider>
    <html lang="en">
      <body className={`${dmSans.variable} ${geistMono.variable} antialiased`}>
        {/* Captures UTM params + initializes Mixpanel on every page load */}
        <AttributionCapture />
        {googleTagManagerId && <GoogleTagManager gtmId={googleTagManagerId} />}
        {metaPixelId && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${metaPixelId}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
        {linkedinPartnerId && (
          <>
            <Script id="linkedin-insight" strategy="afterInteractive">
              {`
                window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                window._linkedin_data_partner_ids.push('${linkedinPartnerId}');
                (function(l) {
                  if (!l) {
                    window.lintrk = function(a, b) {
                      window.lintrk.q.push([a, b]);
                    };
                    window.lintrk.q = [];
                  }
                  var s = document.getElementsByTagName("script")[0];
                  var b = document.createElement("script");
                  b.type = "text/javascript";
                  b.async = true;
                  b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                  s.parentNode.insertBefore(b, s);
                })(window.lintrk);
              `}
            </Script>
            <noscript>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                alt=""
                src={`https://px.ads.linkedin.com/collect/?pid=${linkedinPartnerId}&fmt=gif`}
              />
            </noscript>
          </>
        )}
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </body>
      {/* GA4 — loads the gtag script. Safe to render with placeholder ID */}
      {googleAnalyticsId && (
        <GoogleAnalytics gaId={googleAnalyticsId} />
      )}
    </html>
    </ClerkProvider>
  );
}
