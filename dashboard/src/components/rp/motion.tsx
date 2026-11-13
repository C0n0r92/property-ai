"use client";

/**
 * The site's motion vocabulary, so every page moves the same way:
 * - CountUp: a figure counts up from zero when it first scrolls into view
 * - Reveal: a block eases up into place when it first scrolls into view
 *
 * Both render their final state on the server (search engines and people
 * who ask for reduced motion see the real figure straight away).
 */
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

/** The one easing curve used for entrances across the site. */
export const EASE = [0.2, 0.8, 0.2, 1] as const;

type Format = "int" | "euro" | "pct" | "signedPct";

function formatValue(value: number, format: Format, decimals: number): string {
  switch (format) {
    case "euro":
      return `€${Math.round(value).toLocaleString("en-IE")}`;
    case "pct":
      return `${value.toFixed(decimals)}%`;
    case "signedPct":
      return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(decimals)}%`;
    default:
      return Math.round(value).toLocaleString("en-IE");
  }
}

export function CountUp({
  value,
  format = "int",
  decimals = 1,
  duration = 1.2,
}: {
  value: number;
  format?: Format;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  const started = useRef(false);
  // The text is written directly while counting, so React does not re-render each frame
  const write = (v: number) => {
    if (ref.current) ref.current.textContent = formatValue(v, format, decimals);
  };

  // Below the fold, wait at zero so the count is seen when it arrives
  useEffect(() => {
    if (reduce || started.current) return;
    const rect = ref.current?.getBoundingClientRect();
    if (rect && rect.top > window.innerHeight) write(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  useEffect(() => {
    if (!inView || reduce || started.current) return;
    started.current = true;
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: write });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className="rp-countup">
      {formatValue(value, format, decimals)}
    </span>
  );
}

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
  ...rest
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section";
  id?: string;
  "aria-labelledby"?: string;
}) {
  const reduce = useReducedMotion();
  const Plain = as;
  if (reduce) return <Plain className={className} {...rest}>{children}</Plain>;
  const Moving = as === "section" ? motion.section : motion.div;
  return (
    <Moving
      {...rest}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Moving>
  );
}
