"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
        <EnokiFlowProvider apiKey={process.env.ENOKI_PUB_KEY!}>
          <body className={inter.className}>{children}</body>
          <Analytics />
          <Toaster closeButton  />
        </EnokiFlowProvider>
    </html>
  );
}
