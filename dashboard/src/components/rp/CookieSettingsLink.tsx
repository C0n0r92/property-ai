"use client";

import { saveConsent } from "@/lib/consent";

/** Clears the visitor's analytics answer so the banner asks again. */
export default function CookieSettingsLink() {
  return (
    <button
      type="button"
      className="rp-link rp-cookie-settings"
      onClick={() => saveConsent(null)}
    >
      Cookie settings
    </button>
  );
}
