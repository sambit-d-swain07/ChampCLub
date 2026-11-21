import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Champions Club | Sports Club Management System",
  description: "Elite Sports Club Management Suite - Tennis, Padel, Badminton, Pro Shop, and Bar Operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
