"use client";

import { useState } from "react";

/** A button, not a link that acts on load: mail scanners open links in emails. */
export default function StopAlert({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "stopped" | "gone" | "error">("idle");
  async function stop() {
    setState("busy");
    try {
      const res = await fetch("/api/real-price/alert/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      setState(!res.ok ? "error" : data.stopped ? "stopped" : "gone");
    } catch {
      setState("error");
    }
  }
  if (state === "stopped") return <p className="rp-area-lede" role="status">Stopped. We&apos;ve deleted the alert and your email address with it.</p>;
  if (state === "gone") return <p className="rp-area-lede" role="status">There&apos;s no alert to stop: it was already stopped or sent.</p>;
  return (
    <>
      <button type="button" className="rp-button rp-button--ink" onClick={stop} disabled={state === "busy"}>
        {state === "busy" ? "Stopping…" : "Stop the alert"}
      </button>
      {state === "error" && <p role="status">That didn&apos;t work just now. Try again in a moment.</p>}
    </>
  );
}
