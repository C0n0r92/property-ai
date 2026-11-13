"use client";

import { useEffect, useRef, useState } from "react";

export interface StoryStep {
  /** The big figure, e.g. "+7.3%" */
  figure: string;
  /** What the figure is, under it */
  label: string;
  /** The paragraph that scrolls past while this figure shows */
  text: string;
}

/**
 * The month's story told by scrolling: a pinned panel shows one big figure
 * at a time, changing as each paragraph reaches the middle of the screen,
 * with a progress bar that follows the scroll (GSAP ScrollTrigger). With
 * reduced motion, or before the script loads, it is a plain list.
 */
export default function ReportStory({ steps, title }: { steps: StoryStep[]; title: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [animated, setAnimated] = useState(false);

  // Switch to the two-column layout first (only with motion allowed)...
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const frame = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // ...then measure: positions taken before the layout changes would be wrong
  useEffect(() => {
    const el = root.current;
    if (!el || !animated) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        // Each paragraph takes over the panel as it reaches the middle of the screen
        el.querySelectorAll<HTMLElement>(".rp-story-step").forEach((step, i) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 55%",
            end: "bottom 45%",
            onEnter: () => setActive(i),
            onEnterBack: () => setActive(i),
          });
          gsap.fromTo(
            step,
            { opacity: 0.25 },
            { opacity: 1, ease: "none", scrollTrigger: { trigger: step, start: "top 75%", end: "top 45%", scrub: true } },
          );
        });
        // The progress bar fills as the story is read
        gsap.fromTo(
          ".rp-story-progress i",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 40%", end: "bottom 60%", scrub: true } },
        );
      }, el);
      ScrollTrigger.refresh();
      cleanup = () => ctx.revert();
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [animated]);

  // Each change of figure animates in (CSS, keyed on the step)
  const step = steps[active];

  return (
    <section className={`rp-story${animated ? " is-animated" : ""}`} ref={root} aria-label={title}>
      <div className="rp-story-panel" aria-hidden={animated ? "true" : undefined}>
        <div className="rp-story-progress">
          <i />
        </div>
        <div className="rp-story-figure" key={active}>
          <b>{step.figure}</b>
          <span>{step.label}</span>
        </div>
        <ol className="rp-story-dots">
          {steps.map((s, i) => (
            <li key={s.label} className={i === active ? "is-on" : ""} />
          ))}
        </ol>
      </div>
      <div className="rp-story-steps">
        {steps.map((s) => (
          <div className="rp-story-step" key={s.label}>
            <p className="rp-story-step-figure">
              {s.figure} <span>{s.label}</span>
            </p>
            <p>{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
