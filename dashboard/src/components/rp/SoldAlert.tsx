"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { trackEvent } from "@/lib/analytics";

interface Props {
  /** The home's address, with its house number */
  address: string;
  askingPrice?: number;
  /** What the price check said, quoted back in the email */
  predictedMid?: number;
  /** The home's county; Dublin unless said */
  county?: string;
  compact?: boolean;
}

type Status = "idle" | "sending" | "done" | "already" | "error";

/** "Tell me what it sold for": one email when the home appears in the register. */
export default function SoldAlert({ address, askingPrice, predictedMid, county, compact = false }: Props) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const home = address.split(",")[0].trim();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/real-price/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, address, askingPrice, predictedMid, county, company }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(
          data.error === "invalid_email"
            ? "That email address doesn’t look right. Check it and try again."
            : data.error === "needs_house_number"
              ? "We need the home’s house number to know when it sells."
              : data.error === "too_many_requests"
                ? "That’s a lot in a short time. Try again in ten minutes."
                : "That didn’t work just now. Try again in a minute.",
        );
        return;
      }
      setStatus(data.already ? "already" : "done");
      trackEvent({ action: "sold_alert", category: "tools", label: data.already ? "already" : "new" });
    } catch {
      setStatus("error");
      setMessage("That didn’t work just now. Try again in a minute.");
    }
  }

  if (status === "done" || status === "already") {
    return (
      <div className={`rp-soldalert${compact ? " rp-soldalert--compact" : ""}`} role="status">
        <p>
          <strong>{status === "already" ? "You’re already set." : "Done."}</strong> We’ll email {email} once, when{" "}
          {home} shows up in the Property Price Register.
        </p>
      </div>
    );
  }

  return (
    <form className={`rp-soldalert${compact ? " rp-soldalert--compact" : ""}`} onSubmit={onSubmit}>
      <p className="rp-soldalert-title">
        <strong>Tell me what {home} sells for.</strong> One email, when the sale shows up in the register.
      </p>
      <div className="rp-soldalert-row">
        <label className="rp-visually-hidden" htmlFor={`sold-alert-${home}`}>
          Your email address
        </label>
        <input
          id={`sold-alert-${home}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.ie"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" className="rp-button rp-button--ink" disabled={status === "sending"}>
          {status === "sending" ? "Setting…" : "Email me"}
        </button>
      </div>
      <p className="rp-soldalert-small">
        Nothing else, and you can stop it any time. <Link href="/real-price/privacy">How we use your email address</Link>.
      </p>
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
  );
}
