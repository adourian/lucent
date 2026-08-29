import type { CSSProperties } from "react";

interface EstimateFigureProps {
  mcMean: number;
  uncertainty: number;
}

type EstimateScaleStyle = CSSProperties & {
  "--estimate-position": string;
  "--range-start": string;
  "--range-width": string;
};

const asPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
const asPointValue = (value: number) => (value * 100).toFixed(1);
const asPoints = (value: number) =>
  `${asPointValue(value)} percentage points`;
const calibrationTicks = Array.from({ length: 21 }, (_, index) => index);

function EstimateFigure({
  mcMean,
  uncertainty,
}: EstimateFigureProps) {
  const lowerBound = Math.max(0, mcMean - uncertainty);
  const upperBound = Math.min(1, mcMean + uncertainty);
  const scaleStyle: EstimateScaleStyle = {
    "--estimate-position": `${mcMean * 100}%`,
    "--range-start": `${lowerBound * 100}%`,
    "--range-width": `${(upperBound - lowerBound) * 100}%`,
  };

  return (
    <figure
      className="estimate-figure"
      aria-label={`Estimated probability ${asPercent(
        mcMean,
      )}, based on the mean of 500 Monte Carlo dropout passes, with a standard deviation of ${asPoints(
        uncertainty,
      )}.`}
    >
      <div className="estimate-figure__instrument" aria-hidden="true">
        <span>Inference signal</span>
        <span className="mono">MC / 500 passes</span>
      </div>

      <div className="estimate-readout">
        <div className="estimate-readout__metric estimate-readout__metric--primary">
          <span className="estimate-readout__label">Estimated probability</span>
          <strong className="estimate-readout__value estimate-readout__value--primary mono">
            {asPercent(mcMean)}
          </strong>
        </div>
        <div className="estimate-readout__metric estimate-readout__metric--dispersion">
          <span className="estimate-readout__label">
            Variation across model passes <span aria-hidden="true">(σ)</span>
            <span className="sr-only">standard deviation</span>
          </span>
          <strong className="estimate-readout__value estimate-readout__value--dispersion mono">
            <span>{asPointValue(uncertainty)}</span>
            <span className="estimate-readout__unit">percentage points</span>
          </strong>
        </div>
      </div>

      <div className="estimate-scale" style={scaleStyle} aria-hidden="true">
        <div className="estimate-scale__header">
          <span>Probability scale</span>
          <span className="mono">
            {asPercent(lowerBound)}–{asPercent(upperBound)} · mean ± 1σ
          </span>
        </div>
        <div className="estimate-scale__plot">
          <span className="estimate-scale__calibration">
            {calibrationTicks.map((tick) => (
              <i
                className={tick % 5 === 0 ? "is-major" : undefined}
                key={tick}
              />
            ))}
          </span>
          <span className="estimate-scale__range" />
          <span className="estimate-scale__point" />
        </div>
        <div className="estimate-scale__ticks mono">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100%</span>
        </div>
      </div>

      <div className="estimate-legend" aria-hidden="true">
        <span className="estimate-legend__item">
          <i className="estimate-legend__point" /> MC mean {asPercent(mcMean)}
        </span>
        <span className="estimate-legend__item">
          <i className="estimate-legend__range" /> Mean ± 1σ dropout span
        </span>
      </div>

      <figcaption>
        The marker is the mean of 500 stochastic dropout passes. The band spans
        that mean plus or minus one standard deviation, clipped to the 0–100%
        scale. It is not a confidence interval.
      </figcaption>
    </figure>
  );
}

export default EstimateFigure;
