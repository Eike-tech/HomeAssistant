import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./cockpit.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-tc-display",
});
const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-tc-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-tc-mono",
});

export const metadata: Metadata = {
  title: "Cockpit",
  description: "Smart Home Cockpit",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05080d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
