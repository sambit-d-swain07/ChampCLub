import type { Metadata } from "next";
import { Anton, Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-anton",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-brand",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Champions Club · Tennis, Padel & Badminton",
  description:
    "Six championship courts, a pro shop and a clubhouse bar. Book a session in a few taps with instant member discounts.",
  openGraph: {
    title: "Champions Club · Tennis, Padel & Badminton",
    description:
      "Six championship courts, a pro shop and a clubhouse bar. Book a session in a few taps with instant member discounts.",
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
      className={`${anton.variable} ${plusJakartaSans.variable} ${inter.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-white text-[#111111]">
        {children}
      </body>
    </html>
  );
}
