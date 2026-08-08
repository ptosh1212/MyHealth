import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import RouteGuard from "@/components/RouteGuard";
import GlobalAlertModal from "@/components/GlobalAlertModal";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My Health :)",
  description: "My Health is a clinic management system built for Indian doctors. Manage walk-in patients, online bookings, token queue and WhatsApp updates — all in one simple dashboard. NOT a patient marketplace.",
  keywords: [
    "clinic management system India",
    "doctor clinic software",
    "patient token system",
    "walk-in patient management",
    "online appointment clinic",
    "clinic queue management",
    "whatsapp patient updates",
    "doctor dashboard India",
    "small clinic software",
    "clinic operating system",
    "My Health",
    "clinic management app",
    "reception management software",
    "doctor appointment software India",
    "clinic management saas India",
    "patient queue system",
    "digital clinic India",
    "outpatient management",
    "OPD management software",
    "clinic automation India"
  ],
  authors: [{ name: "My Health" }],
  creator: "My Health",
  publisher: "My Health",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://ananthealth.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "My Health - Book Doctors Online | Skip the Line",
    description: "Book doctor appointments instantly. Get ambulance in 10 minutes, medicines delivered fast. Smart queue system, digital prescriptions.",
    url: 'https://ananthealth.com',
    siteName: 'My Health',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'My Health - Your Healthcare Assistant',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'My Health - Book Doctors Online',
    description: 'Book appointments instantly. Ambulance in 10 min. Smart queue system.',
    images: ['/og-image.png'],
    creator: '@ananthealth',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/icon.png' },
      { url: '/icon.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
      },
    ],
  },
  manifest: '/manifest.json',
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'healthcare',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "MedicalBusiness",
              "name": "My Health",
              "description": "Online healthcare platform for booking doctors, ambulance services, and medicine delivery",
              "url": "https://ananthealth.com",
              "logo": "https://ananthealth.com/logo.svg",
              "image": "https://ananthealth.com/og-image.png",
              "priceRange": "₹₹",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "IN"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "reviewCount": "10000"
              },
              "sameAs": [
                "https://twitter.com/ananthealth",
                "https://facebook.com/ananthealth",
                "https://instagram.com/ananthealth"
              ],
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://ananthealth.com/patient/search?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" defer></script>
        
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-18021935082"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-18021935082');
              window.gtag_report_conversion = function(url) {
                var callback = function () {
                  if (typeof(url) != 'undefined') {
                    window.location = url;
                  }
                };
                window.gtag('event', 'conversion', {
                    'send_to': 'AW-18021935082/hQDFCMD24owcEOrPw5FD',
                    'event_callback': callback
                });
                return false;
              };
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <RouteGuard>
            {children}
            <GlobalAlertModal />
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  );
}