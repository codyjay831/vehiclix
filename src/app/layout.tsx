import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/public/Navbar";
import { getAuthenticatedUser } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Evo Motors",
    default: "Evo Motors | Premium EV Showroom",
  },
  description: "Boutique electric vehicle dealership and home energy solutions.",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Evo Motors | Premium EV Showroom",
    description: "Boutique electric vehicle dealership and home energy solutions.",
    type: "website",
    locale: "en_US",
    siteName: "Evo Motors",
  },
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getAuthenticatedUser();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Navbar userRole={user?.role || null} />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
