"use client";

import { useRef } from "react";
import DotPlot from "./DotPlot";

interface Props {
  title: string;
  subtitle: string;
  price: number;
  count: number;
  dots: number[];
  salesPerDot: number;
  askingPrice: number;
  litUpTo: number;
}

const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;

/**
 * The real report cover, rendered live for the current check and held in 3D.
 * It turns towards the pointer.
 */
export default function ReportPreview(props: Props) {
  const stage = useRef<HTMLDivElement>(null);

  function onMove(event: React.PointerEvent) {
    const el = stage.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty(
      "--rx",
      String(((event.clientY - rect.top) / rect.height - 0.5) * -14),
    );
    el.style.setProperty(
      "--ry",
      String(((event.clientX - rect.left) / rect.width - 0.5) * 22),
    );
  }

  function onLeave() {
    stage.current?.style.removeProperty("--rx");
    stage.current?.style.removeProperty("--ry");
  }

  return (
    <div
      className="rp-preview"
      ref={stage}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-hidden="true"
    >
      <div className="rp-preview-stack">
        <div className="rp-preview-sheet rp-preview-sheet--back" />
        <div className="rp-preview-sheet rp-preview-sheet--mid" />
        <div className="rp-preview-sheet rp-preview-cover">
          <div className="rp-preview-brand">Real Price Report</div>
          <div className="rp-preview-title">{props.title}</div>
          <div className="rp-preview-sub">{props.subtitle}</div>
          <div className="rp-preview-plot">
            <DotPlot
              values={props.dots}
              salesPerDot={props.salesPerDot}
              askingPrice={props.askingPrice}
              litUpTo={props.litUpTo}
              height={120}
              fixedWidth={248}
            />
          </div>
          <div className="rp-preview-answer">
            <small>Likely to sell for about</small>
            <strong>{euro(props.price)}</strong>
            <small>Based on {props.count} comparable sales</small>
          </div>
        </div>
      </div>
    </div>
  );
}
