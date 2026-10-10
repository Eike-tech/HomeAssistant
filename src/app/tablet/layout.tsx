import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./tablet.css";

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

export default function TabletLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${display.variable} ${sans.variable} ${mono.variable}`}>{children}</div>
  );
}
