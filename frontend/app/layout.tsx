import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import OfflineBanner from "./components/OfflineBanner";
import PwaRegister from "./components/PwaRegister";
import ReferralCapture from "./components/ReferralCapture";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "LocalPilot AI",
    template: "%s · LocalPilot AI",
  },
  description: "Yerel işletmeler için akıllı yönetim paneli.",
  applicationName: "LocalPilot AI",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LocalPilot",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="flex min-h-dvh flex-col overscroll-y-none">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
        >
          İçeriğe atla
        </a>
        <OfflineBanner />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <div id="main-content" className="flex min-h-0 flex-1 flex-col">
          {children}
        </div>
        <PwaRegister />
      </body>
    </html>
  );
}
