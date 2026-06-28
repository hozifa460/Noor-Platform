import type { Metadata, Viewport } from "next";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Toaster as Sonner } from "@/components/ui/sonner";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة النور — Islamic Streaming Platform",
  description:
    "منصة بث إسلامية احترافية تعتمد على مستودعات GitHub و GitLab كقاعدة بيانات موزعة لمحتوى المشايخ.",
  keywords: ["Islamic", "Streaming", "Quran", "Sheikh", "GitHub", "GitLab", "منصة إسلامية"],
  authors: [{ name: "Noor Platform" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "منصة النور",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "منصة النور — Islamic Streaming Platform",
    description:
      "Premium Islamic streaming platform powered by GitHub & GitLab repositories.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f7c66",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${amiri.variable} font-sans antialiased bg-background text-foreground min-h-screen`}
      >
        <Providers>
          {children}
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
