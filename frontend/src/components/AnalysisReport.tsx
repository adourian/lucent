import { forwardRef } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

import {
  formatDate,
  formatEnrollment,
  formatGeneratedTime,
  formatRegistryValue,
  formatStatus,
} from "../lib/format";
import type { AnalysisResult } from "../types";
import EstimateFigure from "./EstimateFigure";
import SponsorContext from "./SponsorContext";

interface AnalysisReportProps {
  result: AnalysisResult;
  loading: boolean;
  requestFailed: boolean;
}

const AnalysisReport = forwardRef<HTMLElement, AnalysisReportProps>(
  function AnalysisReport({ result, loading, requestFailed }, ref) {
    const registryUrl = `https://clinicaltrials.gov/study/${encodeURIComponent(
      result.nctid,
    )}`;
    const title = formatRegistryValue(result.title, "Untitled trial record");
    const sponsor = formatRegistryValue(result.sponsor);

    return (
      <article
        className="analysis-report"
        ref={ref}
        tabIndex={-1}
        aria-labelledby="report-title"
        aria-busy={loading}
      >
        {loading && (
          <p className="report-pending" role="status">
            Previous analysis shown while the new request is running.
          </p>
        )}
        {!loading && requestFailed && (
          <p className="report-pending" role="status">
            Previous successful analysis shown; the latest request did not
            replace it.
          </p>
        )}

        <header className="report-header">
          {result.input_status === "supported_with_missing" && (
            <p className="report-pending">
              Not reported: {result.missing_fields.map((field) =>
                field === "exclusion_criteria" ? "separate exclusion criteria" : field.replace(/_/g, " ")
              ).join(", ")}.
            </p>
          )}
          <div className="report-header__meta">
            <a
              className="report-header__id"
              href={registryUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{result.nctid}</span>
              <ExternalLink aria-hidden="true" size={13} strokeWidth={1.8} />
              <span className="sr-only">
                View on ClinicalTrials.gov (opens in a new tab)
              </span>
            </a>
            <span>
              Analyzed at <time dateTime={result.generated_at}>
                {formatGeneratedTime(result.generated_at)}
              </time>
              {result.cache_hit && " · Cached result"}
            </span>
          </div>

          <h1 id="report-title">{title}</h1>
          <p className="report-header__sponsor">
            <span>Lead sponsor · </span>
            {sponsor}
          </p>

          <div className="trial-classifiers" aria-label="Trial classification">
            <span className="trial-classifier">
              {formatRegistryValue(result.phase, "Phase not reported")}
            </span>
            <span className="trial-classifier">
              {formatStatus(result.status)}
            </span>
          </div>

          <dl className="report-facts">
            <div>
              <dt>Conditions</dt>
              <dd>{formatRegistryValue(result.diseases)}</dd>
            </div>
            <div>
              <dt>Enrollment</dt>
              <dd className="mono">{formatEnrollment(result.enrollment)}</dd>
            </div>
            <div>
              <dt>Completion date</dt>
              <dd className="mono">{formatDate(result.completion_date)}</dd>
            </div>
          </dl>
        </header>

        <section className="report-section" aria-labelledby="estimate-heading">
          <div className="report-section__heading">
            <p className="section-index">01 / Estimate</p>
            <h2 id="estimate-heading">
              Estimated probability of a favorable trial outcome
            </h2>
          </div>

          <EstimateFigure
            mcMean={result.probability}
            uncertainty={result.uncertainty}
          />

          <aside className="interpretation-note" aria-labelledby="reading-heading">
            <h3 id="reading-heading">How to read this</h3>
            <p>
              The point estimate is the mean of 500 stochastic model passes for
              the binary favorable-outcome target at the trial&apos;s current
              development stage. It is not a direct probability of regulatory
              approval or overall clinical benefit. MC-dropout dispersion
              describes how much those passes vary; it does not identify
              trial-specific risk factors or provide a calibrated clinical
              confidence interval.
            </p>
          </aside>
        </section>

        <section className="report-section" aria-labelledby="context-heading">
          <div className="report-section__heading">
            <p className="section-index">02 / Context</p>
            <h2 id="context-heading">Model context and limits</h2>
          </div>

          <div className="model-context">
            <div className="model-context__block">
              <h3>Record fields used by the model</h3>
              <p>
                Lead sponsor, conditions, brief summary, inclusion criteria,
                exclusion criteria, and trial phase. Title, registry status,
                enrollment, completion date, and market data are report context
                only.
              </p>
            </div>
            <div className="model-context__block">
              <h3>Interpretive limits</h3>
              <ul>
                <li>
                  The binary target does not explain why an outcome was classified
                  as favorable or unfavorable.
                </li>
                <li>No feature attribution or causal explanation is returned.</li>
                <li>The analysis time records when this estimate was computed.</li>
              </ul>
              <Link className="model-context__link" to="/about">
                Read the full model note
              </Link>
            </div>
          </div>
        </section>

        <section
          className="report-section report-section--secondary"
          aria-labelledby="sponsor-heading"
        >
          <div className="report-section__heading">
            <p className="section-index">03 / Secondary context</p>
            <h2 id="sponsor-heading">Sponsor and market context</h2>
          </div>
          <SponsorContext
            key={result.generated_at}
            sponsor={result.sponsor}
          />
        </section>
      </article>
    );
  },
);

export default AnalysisReport;
