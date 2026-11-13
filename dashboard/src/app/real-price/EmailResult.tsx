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
}

type Status = "idle" | "sending" | "emailed" | "saved" | "error";

/** "Not bidding yet?": email the free answer, with a separate alert opt-in. */
export default function EmailResult({ query, areaLabel }: Props) {
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
            : data.error === "too_many_requests"
              ? "That’s a lot of emails in a short time. Try again in ten minutes."
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
    <section className="rp-section rp-keep" aria-labelledby="rp-keep-title">
      <div>
        <h2 className="rp-h2" id="rp-keep-title">
          Not bidding yet? Keep this answer.
        </h2>
      </div>
      {done ? (
        <div className="rp-prose" role="status">
          <p>
            <strong>
              {status === "emailed"
                ? `Sent to ${email}.`
                : `Saved for ${email}.`}
            </strong>{" "}
            {status === "saved"
              ? "The email couldn’t go out just now. We’ll send it as soon as it can."
              : alerts
                ? `We’ll also email you when a similar home sells in ${areaLabel}.`
                : "The email links straight back to this answer."}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="rp-keep-form">
          <div className="rp-prose">
            <p>
              We’ll email you this result with a link back to it, ready for when
              the right home comes up.
            </p>
          </div>
          <div className="rp-keep-row">
            <label className="rp-home-field">
              <span>Your email address</span>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.ie"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button
              className="rp-button rp-button--ink"
              type="submit"
              disabled={status === "sending"}
            >
              {status === "sending" ? "Sending…" : "Email it to me"}
            </button>
          </div>
          <label className="rp-keep-alert">
            <input
              type="checkbox"
              checked={alerts}
              onChange={(e) => setAlerts(e.target.checked)}
            />
            Also tell me when a similar home sells in {areaLabel}. Optional, and
            every email has a one-click unsubscribe.
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
    </section>
  );
}
