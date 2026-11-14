import RpShell from "@/components/rp/RpShell";
import SiteFooter from "@/components/rp/SiteFooter";
import RealPriceNav from "../real-price/RealPriceNav";
import "../blog/blog.css";
import "../areas/areas.css";
import "../streets/streets.css";
import "../worth/worth.css";
import "./home.css";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RpShell>
      <RealPriceNav cta="/#report" />
      {children}
      <SiteFooter />
    </RpShell>
  );
}
