import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

import { copy, seo } from "@/lib/content";
import { BRAND, INSTAGRAM_URL, SITE_URL } from "@/lib/site";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: BRAND.paper,
  colorScheme: "light",
};

const ogImage = { url: "/og/og.jpg", width: 1200, height: 630, alt: seo.ogAlt, type: "image/jpeg" };

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: seo.title, template: seo.titleTemplate },
  description: seo.description,
  keywords: seo.keywords,
  applicationName: copy.brandSub,
  authors: [{ name: copy.name, url: INSTAGRAM_URL }],
  creator: copy.name,
  publisher: copy.name,
  category: "art",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: copy.brandSub,
    title: seo.title,
    description: seo.socialDescription,
    locale: "en_US",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.socialDescription,
    images: [{ url: ogImage.url, alt: ogImage.alt }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  appleWebApp: { title: "Jana", statusBarStyle: "default" },
};

// Hides the hero until its intro animation is ready, unless the visitor prefers reduced
// motion. If the motion code never boots, the hero is revealed again after 4 seconds.
const MOTION_BOOT = `(function(){try{var d=document.documentElement;if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-motion');setTimeout(function(){if(!window.__janaMotion)d.classList.remove('js-motion')},4000)}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" dir="ltr" className={archivo.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
