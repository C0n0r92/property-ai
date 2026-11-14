import type { Metadata } from "next";
import StopAlert from "./StopAlert";

export const metadata: Metadata = {
  title: "Stop an alert",
  robots: { index: false, follow: false },
};

type Search = Promise<{ token?: string }>;

export default async function StopAlertPage({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(token);
  return (
    <main className="rp-area">
      <section className="rp-wrap rp-areas-head">
        <h1 className="rp-area-title">Stop the sold-price alert?</h1>
        {valid ? (
          <>
            <p className="rp-area-lede">We won&apos;t email you about this home, and we&apos;ll delete your email address.</p>
            <StopAlert token={token} />
          </>
        ) : (
          <p className="rp-area-lede">This link isn&apos;t complete. Use the link in the email exactly as it came.</p>
        )}
      </section>
    </main>
  );
}
