import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "iPad Cockpit",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Cockpit",
  },
};

export const viewport: Viewport = {
  width: 1024,
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function IpadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
