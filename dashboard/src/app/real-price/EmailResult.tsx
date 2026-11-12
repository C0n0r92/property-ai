"use client";

import { FormEvent, useState } from "react";
import type { TypeGroup } from "@/lib/real-price/model";
import { trackEvent } from "@/lib/analytics";

interface Props {
  query: {
    areaKey: string;
    typeGroup: TypeGroup;
    beds: number;
    askingPrice: number;
  };
  areaLabel: string;
  /** The answer, so the email preview shows exactly what will arrive. */
  likelyPrice: number;
  homeLabel: string;
}

type Status = "idle" | "sending" | "emailed" | "saved" | "error";

const euro = (v: number) => `€${Math.round(v).toLocaleString("en-IE")}`;

/** "Not bidding yet? Email me this result", with a separate alert opt-in. */
export default function EmailResult({
  query,
  areaLabel,
  likelyPrice,
  homeLabel,
}: Props) {
  const [email, setEmail] = useState("");
  const [alerts, setAlerts] = useState(false);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const done = status === "emailed" || status === "saved";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const response = await fetch("/api/real-price/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          query,
          marketingConsent: alerts,
          company,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(
          data.error === "invalid_email"
            ? "That email address doesn’t look right. Check it and try again."
            : "The email couldn’t be sent just now. Try again in a minute.",
        );
        return;
      }
      setStatus(data.emailed ? "emailed" : "saved");
      trackEvent({
        action: "real_price_email",
        category: "tools",
        label: query.areaKey,
      });
    } catch {
      setStatus("error");
      setMessage("The email couldn’t be sent just now. Try again in a minute.");
    }
  }

  return (
    <section
      className={`rp-mail${done ? " rp-mail--done" : ""}`}
      aria-labelledby="rp-mail-title"
    >
      <div className="rp-mail-copy">
        <h2 className="rp-mail-title" id="rp-mail-title">
          {done ? "It’s on its way." : "Not bidding yet? Keep this answer."}
        </h2>
        <p className="rp-mail-sub">
          {done
            ? alerts
              ? `Check your inbox. We’ll also email you when a similar home sells in ${areaLabel}.`
              : "Check your inbox. The email links straight back to this result."
            : "We’ll email you this result with a link back to it, so it’s there when the right home comes up."}
        </p>

        {!done && (
          <form onSubmit={onSubmit} noValidate={false}>
            <div className="rp-mail-field">
              <input
                type="email"
                required
                autoComplete="email"
                aria-label="Your email address"
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Email it to me"}
              </button>
            </div>

            <label className="rp-switch">
              <input
                type="checkbox"
                role="switch"
                checked={alerts}
                onChange={(e) => setAlerts(e.target.checked)}
              />
              <span className="rp-switch-track" aria-hidden="true">
                <span />
              </span>
              <span className="rp-switch-text">
                <b>Alert me when a similar home sells in {areaLabel}</b>
                <small>
                  Optional. One click to unsubscribe from any email.
                </small>
              </span>
            </label>

            {/* Hidden from people; bots fill it in */}
            <input
              className="rp-email-trap"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              name="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            {status === "error" && (
              <p className="rp-offer-error" role="alert">
                {message}
              </p>
            )}
          </form>
        )}
      </div>

      {/* A preview of the email itself, so people know what they'll get */}
      <div className="rp-mail-preview" aria-hidden="true">
        <div className="rp-mail-window">
          <div className="rp-mail-meta">
            <span className="rp-mail-avatar">RP</span>
            <span>
              <b>Real Price</b>
              <small>to {email.trim() || "you"}</small>
            </span>
          </div>
          <p className="rp-mail-subject">
            {euro(likelyPrice)}: what a {homeLabel} will really sell for
          </p>
          <p className="rp-mail-body-small">
            A {homeLabel} asking {euro(query.askingPrice)} will likely sell for
            about
          </p>
          <p className="rp-mail-big">{euro(likelyPrice)}</p>
          <span className="rp-mail-button">See it again and try a bid</span>
        </div>
        {alerts && (
          <div className="rp-mail-window rp-mail-window--alert">
            <span className="rp-mail-avatar">RP</span>
            <span>
              <b>A similar home just sold in {areaLabel}</b>
              <small>Asked, sold, and what it means for your bid</small>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
