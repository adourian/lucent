import {
  formatGeneratedTime,
  formatPercentagePoints,
  formatProbability,
} from "../lib/format";
import type { RecentAnalysis } from "../types";

interface RecentAnalysesProps {
  analyses: RecentAnalysis[];
  onSelect: (nctid: string) => void;
}

function RecentAnalyses({ analyses, onSelect }: RecentAnalysesProps) {
  if (analyses.length === 0) return null;

  return (
    <section className="session-log" aria-labelledby="session-log-heading">
      <div className="session-log__header">
        <h2 id="session-log-heading">This session</h2>
        <p>Recent estimates are kept only in this browser tab.</p>
      </div>
      <ol className="session-log__list">
        {analyses.map((analysis) => (
          <li className="session-log__item" key={analysis.nctid}>
            <button
              className="session-log__id mono"
              type="button"
              onClick={() => onSelect(analysis.nctid)}
              aria-label={`Use ${analysis.nctid} in the analysis form`}
            >
              {analysis.nctid}
            </button>
            <span className="session-log__title">
              {analysis.title || "Untitled registry record"}
            </span>
            <span className="session-log__metric mono">
              {formatProbability(analysis.probability)} · σ{" "}
              {formatPercentagePoints(analysis.uncertainty)}
            </span>
            <time className="session-log__time" dateTime={analysis.generatedAt}>
              {formatGeneratedTime(analysis.generatedAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default RecentAnalyses;
