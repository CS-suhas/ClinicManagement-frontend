import { ArrowRightIcon } from "@radix-ui/react-icons";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Link from "next/link";
import {
  LandingHeaderAuth,
  SignedOutOnly,
} from "@/features/landing/components/landing-auth";
import { LandingSearch } from "@/features/landing/components/landing-search";
import { LandingWelcome } from "@/features/landing/components/landing-welcome";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

const ECG_PATH =
  "M0,100 H240 C252,100 258,78 274,78 S296,100 308,100 H650 L670,108 L690,100 H710 L730,6 L752,196 L772,100 H830 C846,100 854,64 878,64 S906,100 922,100 H1000";

export function LandingPage() {
  return (
    <div className={`lp-page ${display.variable} ${body.variable}`}>
      <header className="lp-header">
        <div className="lp-wordmark">
          <svg
            width="26"
            height="20"
            viewBox="0 0 26 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 11h6l3-9 5 16 3-7h7" />
          </svg>
          medipulse life
        </div>
        <LandingHeaderAuth />
      </header>

      <main className="lp-main">
        <h1 className="lp-headline">Good care starts with the right doctor</h1>

        <div className="lp-band" aria-hidden="true">
          <svg
            className="lp-ecg"
            aria-hidden="true"
            viewBox="0 0 1000 200"
            preserveAspectRatio="none"
          >
            <path
              className="lp-ecgLine"
              d={ECG_PATH}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        <p className="lp-copy">
          Search doctors by name, specialty or place, or leave it blank to
          browse everyone.
        </p>

        <LandingSearch />

        <SignedOutOnly>
          <p className="lp-register">
            Are you a doctor?{" "}
            <Link href="/providers">
              Register to start seeing patients
              <ArrowRightIcon aria-hidden="true" />
            </Link>
          </p>
        </SignedOutOnly>
      </main>

      <LandingWelcome />
    </div>
  );
}
