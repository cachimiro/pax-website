import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "PaxBespoke | Custom IKEA Pax Wardrobes | North West England",
    template: "%s | PaxBespoke",
  },
  description:
    "IKEA Pax wardrobe specialists based in Warrington. Affordable custom finishes, expert installation in 1-2 days. Serving the North West within 50 miles. Free video design consultation.",
  keywords: [
    "IKEA Pax wardrobes",
    "custom wardrobes",
    "fitted wardrobes Manchester",
    "fitted wardrobes Warrington",
    "fitted wardrobes Cheshire",
    "bespoke wardrobes North West",
    "IKEA Pax custom doors",
    "wardrobe installation",
  ],
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://paxbespoke.uk",
    siteName: "PaxBespoke",
    title: "PaxBespoke | Custom IKEA Pax Wardrobes | North West",
    description:
      "Affordable custom wardrobes using IKEA Pax. Expert installation in 1-2 days. Based in Warrington, serving the North West.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Header />
        <main className="pt-16 md:pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
