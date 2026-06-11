import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { SITE_URL } from "@/lib/seo/site";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Guia SBS — São Bento do Sapucaí",
  description:
    "O guia completo de São Bento do Sapucaí: restaurantes, pousadas, comércios, eventos, mapa e pontos turísticos da Serra da Mantiqueira.",
  openGraph: {
    siteName: "Guia SBS",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${jakartaSans.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning>
        <div className="min-h-full flex flex-col">{children}</div>
        <div id="portal-root" />
      </body>
    </html>
  );
}
