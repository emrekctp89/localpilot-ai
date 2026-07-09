import type { Metadata } from "next";
import { Suspense } from "react";
import ReferralCapture from "./components/ReferralCapture";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalPilot AI",
  description: "Yerel işletmeler için akıllı yönetim paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
