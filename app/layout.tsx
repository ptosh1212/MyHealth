import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import AuthProvider from "@/components/AuthProvider";
import RouteGuard from "@/components/RouteGuard";
import GlobalAlertModal from "@/components/GlobalAlertModal";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://my-health-fawn.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "My Health — APINCODER | Anant Prakash",
    template: "%s | My Health",
  },

  description:
    "My Health is a healthcare platform created and developed by APINCODER (Anant Prakash), connecting doctors and patients through a simple digital clinic system.",

  keywords: [
    "APINCODER",
    "Anant Prakash",
    "My Health",
    "APINCODER My Health",
    "Anant Prakash My Health",
    "doctor patient platform",
    "clinic management system",
    "clinic queue management",
    "patient token system",
    "doctor dashboard",
    "online appointments",
    "healthcare platform India",
  ],

  authors: [
    {
      name: "Anant Prakash",
      url: SITE_URL,
    },
  ],

  creator: "Anant Prakash (APINCODER)",
  publisher: "My Health",

  applicationName: "My Health",

  category: "healthcare",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "My Health",

    title: "My Health — APINCODER | Anant Prakash",

    description:
      "My Health is a healthcare platform created and developed by APINCODER (Anant Prakash), connecting doctors and patients through a simple digital clinic system.",

    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "My Health — APINCODER | Anant Prakash",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",

    title: "My Health — APINCODER | Anant Prakash",

    description:
      "My Health — a healthcare platform created and developed by APINCODER (Anant Prakash).",

    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,

    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
      },
      {
        url: "/icon.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/icon.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAFAF8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",

    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,

        name: "My Health",

        alternateName: [
          "My Health by APINCODER",
          "APINCODER",
        ],

        url: SITE_URL,

        description:
          "My Health is a healthcare platform created and developed by APINCODER (Anant Prakash).",

        publisher: {
          "@id": `${SITE_URL}/#creator`,
        },

        inLanguage: "en-IN",
      },

      {
        "@type": "Person",
        "@id": `${SITE_URL}/#creator`,

        name: "Anant Prakash",

        alternateName: "APINCODER",

        url: SITE_URL,

        jobTitle: "Developer",

        knowsAbout: [
          "Software Development",
          "Web Development",
          "Healthcare Technology",
          "Artificial Intelligence",
        ],
      },

      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#application`,

        name: "My Health",

        alternateName: "My Health by APINCODER",

        applicationCategory: "HealthApplication",

        operatingSystem: "Web",

        url: SITE_URL,

        description:
          "A digital healthcare platform created and developed by APINCODER (Anant Prakash) for connecting doctors and patients.",

        creator: {
          "@id": `${SITE_URL}/#creator`,
        },

        author: {
          "@id": `${SITE_URL}/#creator`,
        },

        image: `${SITE_URL}/og-image.png`,
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        {/* Google Search Console verification is handled by:
            public/google425bea4ba542ded0.html */}

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />

        {/* Lottie Player */}
        <script
          src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
          defer
        />

        {/* Google Ads / gtag.js */}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=AW-18021935082"
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];

              function gtag() {
                dataLayer.push(arguments);
              }

              gtag('js', new Date());

              gtag('config', 'AW-18021935082');

              window.gtag_report_conversion = function(url) {
                var callback = function() {
                  if (typeof url !== 'undefined') {
                    window.location = url;
                  }
                };

                gtag('event', 'conversion', {
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