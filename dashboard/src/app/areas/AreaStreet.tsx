"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { StreetSale } from "@/lib/real-price/area-page";
import type { TypeGroup } from "@/lib/real-price/model";
import HeroScene from "../real-price/HeroScene";

const Diorama = dynamic(() => import("../real-price/Diorama"), { ssr: false });

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;
const signed = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });

/** The area's latest real sales as the 3D street, with a card for the house pointed at. */
export default function AreaStreet({
  sales,
  type,
  beds,
  children,
}: {
  sales: StreetSale[];
  type: TypeGroup;
  beds: number;
  /** Floating figures over the scene */
  children?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [no3d, setNo3d] = useState(false);
  const sale = hovered === null ? null : sales[hovered];

  return (
    <div className="rp-scene-box rp-area-scene">
      {no3d ? (
        <HeroScene />
      ) : (
        <Diorama sales={sales} type={type} beds={beds} onHover={setHovered} onUnavailable={() => setNo3d(true)} />
      )}
      {children}
      {sale ? (
        <div className="rp-glass rp-sale-card" role="status">
          <span className="rp-sale-card-address">{sale.address}</span>
          <span className="rp-sale-card-row">
            Asked <b>{euro(sale.askingPrice)}</b>
          </span>
          <span className="rp-sale-card-row">
            Sold <b>{euro(sale.soldPrice)}</b>
            <em className={sale.overAskingPct > 0 ? "rp-over" : "rp-under"}>{signed(sale.overAskingPct)}</em>
          </span>
          <span className="rp-sale-card-date">{longDate(sale.soldDate)}</span>
        </div>
      ) : (
        !no3d && (
          <p className="rp-scene-note">
            The {sales.length} latest sales here.{" "}
            <span className="rp-pointer-only">Point at</span>
            <span className="rp-touch-only">Tap</span> a house to see what it sold for.
          </p>
        )
      )}
    </div>
  );
}
