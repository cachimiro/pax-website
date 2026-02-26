import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { LocalBusinessSchema } from "@/components/StructuredData";
import TrackingScript from "@/components/TrackingScript";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TrackingScript />
      <LocalBusinessSchema />
      <Header />
      <main className="pt-16 md:pt-20">{children}</main>
      <Footer />
      <MobileCTABar />
    </>
  );
}
