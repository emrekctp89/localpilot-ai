import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
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
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
