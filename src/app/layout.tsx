import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PaxBespoke | Custom IKEA Pax Wardrobes | North West England",
    template: "%s | PaxBespoke",
  },
  description:
    "IKEA Pax wardrobe specialists based in Warrington. Custom bespoke doors and finishes on IKEA Pax frames. Expert installation in 1-2 days. Serving the North West within 50 miles. Free video design consultation.",
  keywords: [
    "IKEA Pax wardrobes",
    "custom wardrobes",
    "fitted wardrobes Manchester",
    "fitted wardrobes Warrington",
    "fitted wardrobes Cheshire",
    "bespoke wardrobes North West",
    "IKEA Pax custom doors",
    "wardrobe installation",
    "fitted wardrobes Liverpool",
    "IKEA Pax specialist",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://paxbespoke.uk",
    siteName: "PaxBespoke",
    title: "PaxBespoke | Custom IKEA Pax Wardrobes | North West",
    description:
      "IKEA Pax frames with bespoke doors and finishes. Expert installation in 1-2 days. Based in Warrington, serving the North West.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PaxBespoke | Custom IKEA Pax Wardrobes",
    description: "IKEA Pax frames with bespoke doors and finishes. From £800 fitted. North West England.",
  },
  metadataBase: new URL("https://paxbespoke.uk"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
