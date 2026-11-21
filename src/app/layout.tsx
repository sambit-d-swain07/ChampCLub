import type { Metadata } from "next";
import { Bebas_Neue, Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Champions Club | Premier Racquet & Sports Club",
  description: "Championship Tennis, Panoramic Padel & Competition Badminton. World-class courts, pro shop, and artisanal cafeteria in Bengaluru.",
  openGraph: {
    title: "The Champions Club",
    description: "Championship Tennis, Panoramic Padel & Competition Badminton. Book your session today.",
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
      lang="en"
      className={`${bebasNeue.variable} ${playfairDisplay.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-brand-green text-brand-offwhite">
        {children}
      </body>
    </html>
  );
}
