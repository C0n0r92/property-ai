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

/** "Not bidding yet? Email me this result", with separate opt-in for alerts. */
export default function EmailResult({ query, areaLabel }: Props) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

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
          marketingConsent: consent,
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

  if (status === "emailed" || status === "saved") {
    return (
      <div className="rp-email rp-email--done" role="status">
        <p className="rp-email-title">
          {status === "emailed"
            ? "Sent. Check your inbox."
            : "Saved. Your email is on its way."}
        </p>
        <p className="rp-email-sub">
          {consent
            ? `We’ll also tell you when a similar home sells in ${areaLabel}.`
            : "It has a link back to this result whenever you need it."}
        </p>
      </div>
    );
  }

  return (
    <form className="rp-email" onSubmit={onSubmit}>
      <div className="rp-email-copy">
        <p className="rp-email-title">Not bidding yet?</p>
        <p className="rp-email-sub">
          Get this result by email, with a link back to it for when you are.
        </p>
      </div>
      <div className="rp-email-fields">
        <div className="rp-email-row">
          <input
            type="email"
            required
            autoComplete="email"
            aria-label="Your email address"
            placeholder="you@example.ie"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="rp-button rp-button--ink"
            type="submit"
            disabled={status === "sending"}
          >
            {status === "sending" ? "Sending…" : "Email me this result"}
          </button>
        </div>
        <label className="rp-email-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          Also email me when a similar home sells in {areaLabel}. Unsubscribe
          any time.
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
      </div>
    </form>
  );
}
