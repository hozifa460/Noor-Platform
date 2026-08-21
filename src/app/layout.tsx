import type { Metadata, Viewport } from "next";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { Toaster as Sonner } from "@/components/ui/sonner";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "منصة نور — الموسوعة الإسلامية الشاملة للقرآن والحديث والفتاوى والتراث",
  description:
    "منصة إسلامية رائدة تجمع القرآن الكريم بالقراءات العشر، وأمهات كتب الحديث والتفسير والفقه، وموسوعة الفتاوى الشرعية، والإذاعات الإسلامية المباشرة.",
  keywords: ["القرآن الكريم", "الحديث النبوي", "الفتاوى الشرعية", "المكتبة الإسلامية", "المصاحف", "القراءات العشر", "منصة نور"],
  authors: [{ name: "Noor Platform" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "منصة نور",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
  openGraph: {
    title: "منصة نور — الموسوعة الإسلامية الشاملة للقرآن والحديث والفتاوى والتراث",
    description:
      "الموسوعة الإسلامية الشاملة: تلاوات، تفاسير، أحاديث مسندة، فتاوى معتمدة، وأمهات كتب التراث.",
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
