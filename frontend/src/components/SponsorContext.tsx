import { lazy, Suspense, useState } from "react";

import { getSponsorTicker } from "../lib/format";

const MarketPanel = lazy(() => import("./MarketPanel"));

export interface SponsorContextProps {
  sponsor: string | null | undefined;
  className?: string;
}

export function SponsorContext({ sponsor, className }: SponsorContextProps) {
  const ticker = getSponsorTicker(sponsor);
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const sponsorName = sponsor?.trim() || "Sponsor not reported";
  const rootClassName = ["sponsor-context", className]
    .filter(Boolean)
    .join(" ");

  return (
    <details
      className={rootClassName}
      open={isOpen}
      onToggle={(event) => {
        const nextIsOpen = event.currentTarget.open;
        setIsOpen(nextIsOpen);
        if (nextIsOpen) setHasOpened(true);
      }}
    >
      <summary className="sponsor-context__summary">
        <span className="sponsor-context__summary-copy">
          <span className="sponsor-context__title">
            {ticker
              ? "Market data available"
              : "No mapped market data"}
          </span>
        </span>
        <span className="sponsor-context__identity">
          <span className="sponsor-context__sponsor">{sponsorName}</span>
          {ticker ? (
            <span className="sponsor-context__ticker">{ticker}</span>
          ) : null}
        </span>
      </summary>

      <div className="sponsor-context__content">
        <p className="sponsor-context__notice">
          Market information is fetched from an external data provider for
          context only. It is not an input to Lucent&apos;s model and does not
          affect the estimate.
        </p>

        {ticker ? (
          <>
            <p className="sponsor-context__mapping-note">
              The ticker is resolved by an exact sponsor-name match and may
              reflect a historical corporate relationship.
            </p>
            {hasOpened ? (
              <Suspense
                fallback={
                  <div
                    className="market-panel__loading"
                    role="status"
                    aria-live="polite"
                  >
                    Preparing market context…
                  </div>
                }
              >
                <MarketPanel key={ticker} ticker={ticker} />
              </Suspense>
            ) : null}
          </>
        ) : (
          <p className="sponsor-context__empty">
            No exact public-market ticker mapping is available for this
            registry sponsor name.
          </p>
        )}
      </div>
    </details>
  );
}

export default SponsorContext;
