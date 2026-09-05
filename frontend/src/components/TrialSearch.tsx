import type { FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { trackEvent } from "../lib/telemetry";

const EXAMPLE_TRIALS = ["NCT05822830", "NCT04136171"];

interface TrialSearchProps {
  nctid: string;
  modelVersion: string;
  datasetSize: string;
  loading: boolean;
  hasResult: boolean;
  fieldError: string | null;
  serviceError: string | null;
  onChange: (value: string) => void;
  onExampleSelect?: (nctid: string) => void;
  onSubmit: () => void;
}

function TrialSearch({
  nctid,
  modelVersion,
  datasetSize,
  loading,
  hasResult,
  fieldError,
  serviceError,
  onChange,
  onExampleSelect,
  onSubmit,
}: TrialSearchProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const errorMessage = fieldError ?? serviceError;
  const errorId = errorMessage ? "nctid-error" : undefined;

  return (
    <section
      className={`query-panel${hasResult ? " query-panel--compact" : ""}`}
      aria-labelledby="analysis-heading"
    >
      <div className="query-panel__heading">
        <p className="eyebrow">Clinical trial prediction</p>
        {hasResult ? (
          <p className="query-panel__utility-title" id="analysis-heading">
            Analyze another trial
          </p>
        ) : (
          <h1 id="analysis-heading">
            Estimate a clinical trial&apos;s probability of success
          </h1>
        )}
        <p>
          Enter a ClinicalTrials.gov identifier to estimate the probability of a
          favorable outcome at the trial&apos;s current development stage, with
          MC-dropout variability.
        </p>
      </div>

      <form className="query-form" onSubmit={handleSubmit} noValidate>
        <label className="query-form__label" htmlFor="nctid-input">
          NCT identifier
        </label>
        <div className="query-form__row">
          <input
            id="nctid-input"
            className="query-form__input mono"
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck="false"
            placeholder="NCT05822830"
            value={nctid}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            aria-describedby={["nctid-guidance", errorId]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={Boolean(fieldError)}
            disabled={loading}
          />
          <button
            className="primary-action"
            type="submit"
            disabled={loading || !nctid.trim()}
          >
            {loading ? (
              <>
                <LoaderCircle
                  className="primary-action__spinner"
                  aria-hidden="true"
                  size={17}
                />
                <span>Running analysis</span>
              </>
            ) : (
              <>
                <span>Run estimate</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </>
            )}
          </button>
        </div>

        <div className="query-form__support">
          <div className="query-form__guidance" id="nctid-guidance">
            <span>Use the format NCT followed by eight digits.</span>
            <a
              className="query-form__registry-link"
              href="https://clinicaltrials.gov/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("registry_link_opened")}
            >
              Find a trial on ClinicalTrials.gov
              <span aria-hidden="true"> ↗</span>
            </a>
          </div>
          {!hasResult && (
            <div className="query-form__examples" aria-label="Example trials">
              <span>Examples</span>
              {EXAMPLE_TRIALS.map((example) => (
                <button
                  key={example}
                  className="text-action mono"
                  type="button"
                  onClick={() => {
                    onChange(example);
                    onExampleSelect?.(example);
                  }}
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="request-error" id="nctid-error" role="alert">
            <span className="request-error__marker" aria-hidden="true" />
            <div>
              <strong>
                {fieldError ? "Check the identifier" : "Analysis unavailable"}
              </strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="request-status" role="status" aria-live="polite">
            <div className="request-status__track" aria-hidden="true">
              <span />
            </div>
            <div className="request-status__copy">
              <strong>Requesting the trial analysis.</strong>
              <span>
                The service reports only completion, so no percentage is
                available.
              </span>
            </div>
          </div>
        )}
      </form>

      {!hasResult && (
        <dl className="instrument-meta" aria-label="Analysis configuration">
          <div>
            <dt>Registry</dt>
            <dd>ClinicalTrials.gov v2</dd>
          </div>
          <div>
            <dt>Model version</dt>
            <dd className="mono">v{modelVersion}</dd>
          </div>
          <div>
            <dt>Training corpus</dt>
            <dd className="mono">{datasetSize}</dd>
          </div>
          <div>
            <dt>Inference</dt>
            <dd className="mono">500 MC passes</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>Probability + dispersion</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export default TrialSearch;
