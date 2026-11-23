import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APSRTC Live — Travel with confidence",
  description: "Plan journeys across Andhra Pradesh, discover bus services and access official APSRTC tracking.",
  applicationName: "APSRTC Live",
  manifest: "/manifest.webmanifest",
  themeColor: "#071b17"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}