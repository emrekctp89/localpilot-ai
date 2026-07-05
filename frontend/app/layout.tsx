import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
