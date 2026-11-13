import type { Metadata } from "next";
import Link from "next/link";
import CookieSettingsLink from "@/components/rp/CookieSettingsLink";
import RealPriceNav from "../RealPriceNav";

export const metadata: Metadata = {
  title: "Privacy and cookies",
  description:
    "What Irish Property Data collects when you check a price, buy a report or ask for an email, which analytics it uses, and how to have your details deleted.",
  alternates: { canonical: "/real-price/privacy" },
};

const CONTACT = "hello@irishpropertydata.com";

export default function RealPricePrivacy() {
  return (
    <>
      <RealPriceNav cta={false} />
      <main className="rp-wrap rp-privacy">
        <h1 className="rp-h2">What we collect, and why.</h1>
        <div className="rp-prose">
          <p>
            Real Price Check is run by Irish Property Data. This page covers the
            price check, the paid report and the emailed result. To ask about
            any of it, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>

          <h2>Checking a price</h2>
          <p>
            The area, home type, bedrooms and asking price you choose are used
            to work out the answer and are kept in the page address so you can
            share it. We do not store them against you.
          </p>

          <h2 id="cookies">Analytics and cookies</h2>
          <p>
            We count visits, the pages read and which areas are checked with
            PostHog, set up so that it uses no cookies and stores nothing in
            your browser. It cannot recognise you from one day to the next.
          </p>
          <p>
            With your permission we also use Google Analytics, which sets
            cookies to tell new visitors from returning ones. It only loads if
            you choose Allow in the banner. The only thing we keep in your
            browser otherwise is that choice. You can change it at any time:{" "}
            <CookieSettingsLink />.
          </p>

          <h2>Buying a report</h2>
          <p>
            Adding the home’s address is optional. If you add one, we store it
            with the Eircode if you give one, and the home type, bedrooms and
            asking price. The address is printed on your report. Later we
            compare it with the public Property Price
            Register to see what the home sold for, which is how we check and
            improve our estimates. We do not store your name or email with it.
          </p>
          <p>
            Payment is taken by Stripe. Stripe receives your card details and
            email address; we never see your card number. Stripe also holds the
            address and search for your report so that your payment link can
            reopen it.
          </p>

          <h2>Emailing yourself the answer</h2>
          <p>
            We store your email address and the search it was for, and use them
            to send that one email. We do not add you to a mailing list.
          </p>

          <h2>Who else handles it</h2>
          <p>
            Our database and website are hosted by DigitalOcean in Frankfurt.
            Stripe handles payments, an email delivery service sends the
            emails, and PostHog (in the EU) and Google Analytics count visits
            as described above. We do not sell or share your details with
            anyone else.
          </p>

          <h2>How long we keep it, and your rights</h2>
          <p>
            We keep these records until you ask us to delete them. You can ask
            for a copy, a correction or deletion at any time by writing to{" "}
            <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, and we will answer
            within a month. If you are unhappy with how we handle your details
            you can complain to the Data Protection Commission at
            dataprotection.ie.
          </p>

          <p>
            <Link href="/">Back to the price check</Link>
          </p>
        </div>
      </main>
    </>
  );
}
