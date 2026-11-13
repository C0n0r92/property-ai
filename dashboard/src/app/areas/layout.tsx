import RpShell from "@/components/rp/RpShell";
import SiteFooter from "@/components/rp/SiteFooter";
import RealPriceNav from "../real-price/RealPriceNav";
import "../blog/blog.css";
import "./areas.css";

export default function AreasLayout({ children }: { children: React.ReactNode }) {
  return (
    <RpShell>
      <RealPriceNav cta="/#report" />
      {children}
      <SiteFooter />
    </RpShell>
  );
}
