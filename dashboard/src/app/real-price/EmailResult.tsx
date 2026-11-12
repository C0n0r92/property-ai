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

/** "Email this answer to …": the same sentence-as-form as the hero. */
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
    <section className="rp-band rp-band--mail" aria-labelledby="rp-mail-title">
      <div className="rp-band-inner rp-mail-grid">
        <div>
          <p className="rp-hint">Not bidding yet?</p>
          {done ? (
            <>
              <h2 className="rp-sentence rp-band-sentence" id="rp-mail-title">
                Sent to <span className="rp-mail-sent">{email}</span>
              </h2>
              <p className="rp-lede rp-band-lede">
                {alerts
                  ? `We’ll also tell you when a similar home sells in ${areaLabel}.`
                  : "The email links straight back to this answer."}
              </p>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <h2 className="rp-sentence rp-band-sentence" id="rp-mail-title">
                Email this answer to{" "}
                <span
                  className="rp-field rp-field--price rp-field--email"
                  style={
                    {
                      "--chars": `${Math.max(9, email.length) * 0.62}em`,
                    } as React.CSSProperties
                  }
                >
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    aria-label="Your email address"
                    placeholder="your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <svg
                    className="rp-field-icon"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                  >
                    <path
                      d="M8.2 1.8 10.2 3.8 4 10 1.6 10.4 2 8z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </h2>

              <div className="rp-mail-actions">
                <button
                  className="rp-button rp-button--ink"
                  type="submit"
                  disabled={status === "sending"}
                >
                  {status === "sending" ? "Sending…" : "Send it"}
                </button>
                <label
                  className={`rp-glass rp-alert${alerts ? " rp-alert--on" : ""}`}
                >
                  <input
                    type="checkbox"
                    role="switch"
                    checked={alerts}
                    onChange={(e) => setAlerts(e.target.checked)}
                  />
                  <span className="rp-switch-track" aria-hidden="true">
                    <span />
                  </span>
                  Tell me when a similar home sells in {areaLabel}
                </label>
              </div>
              <p className="rp-mail-small">
                The alert is optional. Every email has a one-click unsubscribe.
              </p>

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

        {/* What will arrive, as a floating glass card */}
        <div className="rp-mail-stage" aria-hidden="true">
          <div className="rp-glass rp-mail-card">
            <div className="rp-mail-from">
              <span className="rp-mail-avatar">
                <svg viewBox="0 0 28 28" width="16" height="16">
                  <path d="M4 25V12l10-8 10 8v13z" fill="currentColor" />
                </svg>
              </span>
              <span>
                <b>Real Price</b>
                <small>to {email.trim() || "you"}</small>
              </span>
            </div>
            <p className="rp-mail-line">
              A {homeLabel} asking {euro(query.askingPrice)} will really sell
              for about
            </p>
            <p className="rp-mail-price">{euro(likelyPrice)}</p>
            <span className="rp-mail-cta">See it again and try a bid</span>
          </div>
          {alerts && (
            <div className="rp-glass rp-mail-card rp-mail-card--alert">
              <span className="rp-mail-avatar">
                <svg viewBox="0 0 28 28" width="16" height="16">
                  <path d="M4 25V12l10-8 10 8v13z" fill="currentColor" />
                </svg>
              </span>
              <span>
                <b>A similar home just sold in {areaLabel}</b>
                <small>
                  What it asked, what it got, and what it means for you
                </small>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
