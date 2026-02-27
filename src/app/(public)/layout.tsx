import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MobileCTABar from "@/components/MobileCTABar";
import { LocalBusinessSchema } from "@/components/StructuredData";
import TrackingScript from "@/components/TrackingScript";
import PackageModalProvider from "@/components/PackageModalProvider";
import { Suspense } from "react";
import RouteProgress from "@/components/RouteProgress";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PackageModalProvider>
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      <TrackingScript />
      <LocalBusinessSchema />
      <Header />
      <main className="pt-[60px] md:pt-20">{children}</main>
      <Footer />
      <MobileCTABar />
    </PackageModalProvider>
  );
}
