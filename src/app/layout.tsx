import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  weight: ["400", "500", "700"],
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
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F6F5E1] text-[#1B1B1B]">
        {children}
      </body>
    </html>
  );
}
