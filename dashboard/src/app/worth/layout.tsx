import RpShell from "@/components/rp/RpShell";
import SiteFooter from "@/components/rp/SiteFooter";
import RealPriceNav from "../real-price/RealPriceNav";
import "../blog/blog.css";
import "../areas/areas.css";
import "../streets/streets.css";
import "./worth.css";

export default function WorthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RpShell>
      <RealPriceNav cta="/#report" />
      {children}
      <SiteFooter />
    </RpShell>
  );
}
