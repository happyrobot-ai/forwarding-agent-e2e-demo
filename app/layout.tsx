import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PusherProvider } from "@/components/PusherProvider";
import { SWRProvider } from "@/components/SWRProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { GSAPProvider } from "@/components/gsap/GSAPProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CEVA Logistics - AI Platform",
  description: "Intelligent ground freight powered by AI",
};

// Force dynamic rendering to prevent build-time static generation
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <SWRProvider>
            <PusherProvider>
              <TooltipProvider>
                <GSAPProvider>
                  <Layout>{children}</Layout>
                </GSAPProvider>
              </TooltipProvider>
            </PusherProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
