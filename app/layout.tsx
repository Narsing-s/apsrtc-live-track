import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "APSRTC Live — Travel with confidence",
  description: "Plan journeys across Andhra Pradesh, discover bus services and access official APSRTC tracking.",
  applicationName: "APSRTC Live",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#071b17"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}