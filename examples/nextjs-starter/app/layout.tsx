"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { EnokiFlowProvider } from "@mysten/enoki/react";
import { createNetworkConfig, SuiClientProvider } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ["latin"] });

// Config options for the networks you want to connect to
const { networkConfig } = createNetworkConfig({
  devnet: { url: getFullnodeUrl("devnet") },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <SuiClientProvider networks={networkConfig} defaultNetwork="devnet">
        <EnokiFlowProvider apiKey={process.env.ENOKI_PUB_KEY!}>
          <body className={inter.className}>{children}</body>
          <Analytics />
          <Toaster closeButton  />
        </EnokiFlowProvider>
      </SuiClientProvider>
    </html>
  );
}
