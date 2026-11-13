import RpShell from "@/components/rp/RpShell";
import SiteFooter from "@/components/rp/SiteFooter";
import RealPriceNav from "../real-price/RealPriceNav";
import "./blog.css";

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <RpShell>
      <RealPriceNav cta="/#report" />
      {children}
      <SiteFooter />
    </RpShell>
  );
}
