import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Champions Club · Tennis, Padel & Badminton",
  description:
    "Six courts, a pro shop and a bar. Book a session in a few taps and your member discount is applied for you.",
  openGraph: {
    title: "Champions Club · Tennis, Padel & Badminton",
    description:
      "Six courts, a pro shop and a bar. Book a session in a few taps and your member discount is applied for you.",
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
      className={`${plusJakartaSans.variable} ${inter.variable} ${instrumentSerif.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F6F4EE] text-[#15201A]">
        {children}
      </body>
    </html>
  );
}
