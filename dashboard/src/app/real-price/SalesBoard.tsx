"use client";

import { useEffect, useRef, useState } from "react";

export interface BoardSale {
  address: string;
  area: string;
  askingPrice: number;
  soldPrice: number;
}

interface Props {
  sales: BoardSale[];
  rows?: number;
}

const FLAP_CHARS = " 0123456789,€";
const euro = (value: number) => `€${Math.round(value).toLocaleString("en-IE")}`;

/** One character cell that flips through characters until it lands on `char`. */
function Flap({
  char,
  delay,
  run,
}: {
  char: string;
  delay: number;
  run: number;
}) {
  const [shown, setShown] = useState(char);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (
      run === 0 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(char);
      return;
    }
    let steps = 4 + Math.floor(Math.random() * 5);
    let timer = window.setTimeout(function tick() {
      setFlipping(true);
      if (steps-- <= 0) {
        setShown(char);
        timer = window.setTimeout(() => setFlipping(false), 70);
        return;
      }
      setShown(FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
      timer = window.setTimeout(tick, 55);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [char, delay, run]);

  return (
    <span
      className={`rp-flap${flipping ? " rp-flap--turn" : ""}`}
      aria-hidden="true"
    >
      {shown}
    </span>
  );
}

function FlapText({
  text,
  delay,
  run,
}: {
  text: string;
  delay: number;
  run: number;
}) {
  return (
    <span className="rp-flaps">
      {text.split("").map((char, i) => (
        <Flap key={i} char={char} delay={delay + i * 35} run={run} />
      ))}
      <span className="rp-visually-hidden">{text}</span>
    </span>
  );
}

/**
 * A departures-style board of real Dublin sales. The sold column flips over
 * every few seconds to show a new set, the way a station board updates.
 */
export default function SalesBoard({ sales, rows = 6 }: Props) {
  const [page, setPage] = useState(0);
  const [run, setRun] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const pages = Math.max(1, Math.floor(sales.length / rows));

  // Start flipping when the board comes into view, then turn every 7 seconds
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let interval = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        window.clearInterval(interval);
        if (!entry.isIntersecting) return;
        setRun((r) => r + 1);
        interval = window.setInterval(() => {
          setPage((p) => (p + 1) % pages);
          setRun((r) => r + 1);
        }, 7000);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, [pages]);

  const shown = sales.slice(page * rows, page * rows + rows);

  return (
    <div className="rp-board" ref={box}>
      <div className="rp-board-head" aria-hidden="true">
        <span>Home</span>
        <span className="rp-board-num">Asked</span>
        <span className="rp-board-num">Sold for</span>
      </div>
      <ul className="rp-board-rows" aria-live="polite">
        {shown.map((sale, i) => {
          const over = (sale.soldPrice / sale.askingPrice - 1) * 100;
          return (
            <li key={`${page}-${i}`} className="rp-board-row">
              <span className="rp-board-home">
                <span className="rp-board-address">{sale.address}</span>
                <span className="rp-board-area">
                  {sale.area}
                  {/* On a phone the Asked column is folded into this line */}
                  <span className="rp-board-asked-inline">
                    {" · asked "}
                    {euro(sale.askingPrice)}
                  </span>
                </span>
              </span>
              <span className="rp-board-num rp-board-asked">
                {euro(sale.askingPrice)}
              </span>
              <span className="rp-board-num">
                <FlapText
                  text={euro(sale.soldPrice)}
                  delay={i * 160}
                  run={run}
                />
                <span
                  className={`rp-board-delta${over > 0 ? " rp-board-delta--up" : ""}`}
                >
                  {over >= 0 ? "+" : ""}
                  {over.toFixed(1)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
