import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import RouteGuard from "@/components/RouteGuard";
import GlobalAlertModal from "@/components/GlobalAlertModal";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = "https://my-health-fawn.vercel.app";
const CALLSIGN = "APINCODER";
const PERSON_NAME = "Anant Prakash";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "My Health — APINCODER | Anant Prakash",
    template: "%s | APINCODER — Anant Prakash",
  },

  description:
    "My Health is a clinic management system created by Anant Prakash, known online as APINCODER.",

  keywords: [
    "APINCODER",
    "Anant Prakash",
    "APINCODER Anant Prakash",
    "Anant Prakash APINCODER",
    "Anant",
    "Anant Prakash developer",
    "APINCODER developer",
    "AI developer",
    "AI builder",
    "software developer",
    "My Health",
    "My Health clinic management",
    "clinic management system India",
    "doctor clinic software",
    "patient token system",
    "walk-in patient management",
    "online appointment clinic",
    "clinic queue management",
    "WhatsApp patient updates",
    "doctor dashboard India",
    "small clinic software",
    "clinic operating system",
    "clinic management app",
    "reception management software",
    "doctor appointment software India",
    "clinic management SaaS India",
    "patient queue system",
    "digital clinic India",
    "outpatient management",
    "OPD management software",
    "clinic automation India",
  ],

  authors: [
    {
      name: PERSON_NAME,
      url: SITE_URL,
    },
  ],

  creator: PERSON_NAME,
  publisher: PERSON_NAME,

  applicationName: "My Health",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  alternates: {
    canonical: SITE_URL,
  },

  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "My Health — APINCODER",
    title: "My Health — APINCODER | Anant Prakash",
    description:
      "My Health is a clinic management system created by Anant Prakash, known online as APINCODER.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "My Health — APINCODER | Anant Prakash",
      },
    ],
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    title: "My Health — APINCODER | Anant Prakash",
    description:
      "My Health is created by Anant Prakash, known online as APINCODER.",
    images: ["/og-image.png"],
    creator: "@ananthealth",
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
      },
    ],

    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
      },
    ],
  },

  manifest: "/manifest.json",

  verification: {
    // Add your REAL Google Search Console verification code here
    // after Google gives it to you.
    //
    // google: "YOUR_REAL_GOOGLE_VERIFICATION_CODE",
  },

  category: "healthcare",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /*
   * ============================================================
   * WEBSITE SCHEMA
   *
   * Establishes:
   *
   * APINCODER
   *      ↓
   * Anant Prakash
   *      ↓
   * My Health
   * ============================================================
   */

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",

    "@id": `${SITE_URL}/#website`,

    name: "My Health",

    alternateName: [
      "APINCODER",
      "Anant Prakash",
      "My Health — APINCODER",
    ],

    url: SITE_URL,

    description:
      "My Health is a clinic management system created by Anant Prakash, known online as APINCODER.",

    inLanguage: "en-IN",

    publisher: {
      "@id": `${SITE_URL}/#person`,
    },
  };

  /*
   * ============================================================
   * PERSON SCHEMA
   *
   * This is the important relationship:
   *
   * Anant Prakash
   *      ↕
   * APINCODER
   * ============================================================
   */

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",

    "@id": `${SITE_URL}/#person`,

    name: PERSON_NAME,

    alternateName: CALLSIGN,

    url: SITE_URL,

    description:
      `${PERSON_NAME} is a developer and AI builder known online as ${CALLSIGN}.`,

    jobTitle: "Developer",

    knowsAbout: [
      "Software development",
      "Artificial intelligence",
      "Web development",
      "Next.js",
      "React",
      "Firebase",
      "AI development",
    ],

    mainEntityOfPage: {
      "@id": `${SITE_URL}/#website`,
    },
  };

  /*
   * ============================================================
   * WEBPAGE SCHEMA
   * ============================================================
   */

  const webpageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",

    "@id": `${SITE_URL}/#webpage`,

    url: SITE_URL,

    name: "My Health — APINCODER | Anant Prakash",

    description:
      `Official My Health website created by ${PERSON_NAME}, also known online as ${CALLSIGN}.`,

    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },

    about: {
      "@id": `${SITE_URL}/#person`,
    },

    author: {
      "@id": `${SITE_URL}/#person`,
    },

    inLanguage: "en-IN",
  };

  /*
   * ============================================================
   * SOFTWARE APPLICATION SCHEMA
   *
   * Keeps My Health represented as the actual application,
   * instead of pretending the whole site is a personal portfolio.
   * ============================================================
   */

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",

    name: "My Health",

    applicationCategory: "HealthApplication",

    operatingSystem: "Web",

    url: SITE_URL,

    description:
      "A clinic management system for managing patients, appointments, queues and clinic operations.",

    author: {
      "@id": `${SITE_URL}/#person`,
    },

    creator: {
      "@id": `${SITE_URL}/#person`,
    },
  };

  return (
    <html lang="en">
      <head>
        {/* ======================================================
            FONT CONNECTIONS
        ======================================================= */}

        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* ======================================================
            THEME
        ======================================================= */}

        <meta
          name="theme-color"
          content="#FFFFFF"
        />

        <meta
          name="apple-mobile-web-app-capable"
          content="yes"
        />

        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* ======================================================
            WEBSITE STRUCTURED DATA
        ======================================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteSchema),
          }}
        />

        {/* ======================================================
            PERSON STRUCTURED DATA
        ======================================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(personSchema),
          }}
        />

        {/* ======================================================
            WEBPAGE STRUCTURED DATA
        ======================================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(webpageSchema),
          }}
        />

        {/* ======================================================
            SOFTWARE STRUCTURED DATA
        ======================================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(softwareSchema),
          }}
        />

        {/* ======================================================
            LOTTIE
        ======================================================= */}

        <script
          src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"
          defer
        />

        {/* ======================================================
            GOOGLE ADS / CONVERSION TRACKING
        ======================================================= */}

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