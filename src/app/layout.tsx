import "./globals.scss";

import { Suspense } from "react";
import localFont from 'next/font/local';
import Navbar from "@/components/layout/Navbar";
import { TooltipProvider } from "@/components/ui/tooltip";

import type { Metadata } from "next";

const factionsFont = localFont({
  src: './retrogaming.ttf',
  variable: '--font-retrogaming',
});

export const metadata: Metadata = {
  title: "Factions Companion",
  description: "Companion app for Factions stats and helper programs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={factionsFont.variable}>
      <body id="mainbody"
        className={`${factionsFont.className} sans-serif`}>
        <TooltipProvider>
          <Suspense>
            {children}
            <Navbar />
          </Suspense>
        </TooltipProvider>
      </body>
    </html>
  );
}
