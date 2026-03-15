import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRANDING } from "@/config/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(`https://${BRANDING.platformDomain}`),
  title: {
    template: BRANDING.metadata.titleTemplate,
    default: BRANDING.metadata.defaultTitle,
  },
  description: BRANDING.description,
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: BRANDING.metadata.defaultTitle,
    description: BRANDING.description,
    type: "website",
    locale: "en_US",
    siteName: BRANDING.companyName,
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
