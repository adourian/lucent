const TEXT_MODALITIES = [
  { code: "S", label: "Lead sponsor", encoder: "MiniLM", dimensions: "384d" },
  { code: "C", label: "Conditions", encoder: "MedBERT", dimensions: "768d" },
  {
    code: "I",
    label: "Inclusion text",
    encoder: "BioSimCSE",
    dimensions: "768d",
  },
  {
    code: "E",
    label: "Exclusion text",
    encoder: "BioSimCSE",
    dimensions: "768d",
  },
  {
    code: "B",
    label: "Brief summary",
    encoder: "BioSimCSE",
    dimensions: "768d",
  },
] as const;

function NetworkConnector({
  label,
  caption,
}: {
  label: string;
  caption?: string;
}) {
  return (
    <span className="network-connector" aria-hidden="true" title={label}>
      <i />
      {caption ? (
        <small className="network-connector__caption mono">{caption}</small>
      ) : null}
    </span>
  );
}

export function ModelArchitectureDiagram() {
  return (
    <figure
      className="technical-figure architecture-diagram"
      aria-labelledby="architecture-diagram-title"
    >
      <header className="technical-figure__header">
        <div>
          <p className="technical-figure__eyebrow">Deployed architecture</p>
          <h3 id="architecture-diagram-title">
            From registry fields to outcome probability
          </h3>
        </div>
        <span className="technical-figure__source mono">5 text paths · 1 phase path</span>
      </header>

      <div className="network-overview">
        <section
          className="network-path network-path--text"
          aria-labelledby="text-branch-title"
        >
          <header className="network-path__header">
            <h4 id="text-branch-title">Text branch</h4>
            <span className="mono">5 modalities</span>
          </header>

          <div className="network-path__flow network-path__flow--text">
            <div className="network-node network-node--inputs">
              <p className="architecture-stage__index">01 / Trial record</p>
              <h5>Registry text</h5>
              <ul className="network-modality-list">
                {TEXT_MODALITIES.map(({ code, label }) => (
                  <li key={code}>
                    <span className="mono">{code}</span>
                    <strong>{label}</strong>
                  </li>
                ))}
              </ul>
            </div>

            <NetworkConnector label="Fields are encoded" />

            <div className="network-node network-node--encoders">
              <p className="architecture-stage__index">02 / Semantic encoding</p>
              <h5>Field-specific representations</h5>
              <div className="network-encoder-list">
                {TEXT_MODALITIES.map(({ code, encoder, dimensions }) => (
                  <div key={code}>
                    <span className="network-encoder-list__code mono">{code}</span>
                    <span className="network-encoder-list__name">
                      <strong>{encoder}</strong>
                      <small className="mono">{dimensions}</small>
                    </span>
                    <span className="network-vector" aria-hidden="true">
                      {Array.from({ length: 6 }, (_, index) => (
                        <i key={index} />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <NetworkConnector label="Representations enter separate modality towers" />

            <div className="network-node network-node--fusion">
              <p className="architecture-stage__index">03 / Towers + fusion</p>
              <h5>Independent modality towers</h5>
              <div className="network-tower-bank" aria-hidden="true">
                {TEXT_MODALITIES.map(({ code }) => (
                  <span key={code}>
                    <i />
                    <i />
                    <i />
                    <small className="mono">{code}</small>
                  </span>
                ))}
              </div>
              <p className="network-node__spec mono">256 → 128 → 64 each</p>
              <div className="network-attention">
                <span>Learned query · 1 head</span>
                <strong>Attention fusion</strong>
                <small className="mono">[B, 5, 64] → 64d</small>
              </div>
            </div>
          </div>
        </section>

        <section
          className="network-path network-path--phase"
          aria-labelledby="phase-branch-title"
        >
          <header className="network-path__header">
            <h4 id="phase-branch-title">Phase branch</h4>
            <span className="mono">categorical</span>
          </header>

          <div className="network-path__flow network-path__flow--phase">
            <div className="network-node network-node--phase-input">
              <p className="architecture-stage__index">01 / Trial record</p>
              <h5>Trial phase</h5>
              <p className="network-node__detail">Normalized category</p>
              <div
                className="phase-vector mono"
                role="img"
                aria-label="Illustrative eight-position one-hot vector"
              >
                <span>0</span>
                <span>0</span>
                <span className="phase-vector__active">1</span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
                <span>0</span>
              </div>
            </div>

            <NetworkConnector label="The phase vector is projected" />

            <div className="network-node network-node--phase-projection">
              <p className="architecture-stage__index">02 / Learned projection</p>
              <div className="phase-projection" aria-label="Eight to 32 dimensions">
                <span className="mono">8d</span>
                <i aria-hidden="true" />
                <strong className="mono">32d</strong>
              </div>
              <p className="network-node__detail">
                Linear · BatchNorm · Leaky ReLU · dropout 0.2
              </p>
            </div>
          </div>
        </section>

        <span
          className="network-branch-connector network-branch-connector--text"
          aria-hidden="true"
        >
          <i />
        </span>
        <span
          className="network-branch-connector network-branch-connector--phase"
          aria-hidden="true"
        >
          <i />
        </span>
        <span className="network-merge-connector" aria-hidden="true">
          <i />
          <small className="mono">Parallel paths merge</small>
        </span>

        <section className="network-head" aria-labelledby="head-title">
          <p className="architecture-stage__index">04 / Merge + head</p>
          <h4 id="head-title">Concatenate paths</h4>
          <div className="head-equation mono" aria-label="64 plus 32 equals 96 dimensions">
            <span>64</span>
            <i>+</i>
            <span>32</span>
            <i>=</i>
            <strong>96d</strong>
          </div>

          <p className="network-head__label">Prediction head</p>
          <div className="head-layers" aria-label="128 to 64 to one">
            <span className="mono">128</span>
            <i aria-hidden="true" />
            <span className="mono">64</span>
            <i aria-hidden="true" />
            <span className="mono">1</span>
          </div>

          <div className="head-output">
            <span>Sigmoid</span>
            <strong>One probability</strong>
          </div>
        </section>

        <span className="network-output-connector" aria-hidden="true">
          <i />
        </span>

        <section className="network-probability" aria-label="Model output">
          <p className="architecture-stage__index">05 / Estimate</p>
          <span className="network-probability__symbol mono" aria-hidden="true">
            p
          </span>
          <strong>Favorable trial outcome</strong>
          <span className="mono">0–1</span>
        </section>
      </div>

      <figcaption>
        Five encoded text fields pass through separate 256 → 128 → 64 towers
        before learned-query attention. Separately, the eight-position phase
        vector is projected to 32 dimensions. The 64d text representation and
        32d phase representation are concatenated for the 128 → 64 → 1 head.
        Attention values are not returned as feature attributions.
      </figcaption>
    </figure>
  );
}

export function InferenceProtocolDiagram() {
  return (
    <figure
      className="technical-figure inference-diagram"
      aria-labelledby="inference-diagram-title"
    >
      <header className="technical-figure__header">
        <div>
          <p className="technical-figure__eyebrow">Production inference</p>
          <h3 id="inference-diagram-title">
            One encoded trial, 500 stochastic passes
          </h3>
        </div>
        <span className="technical-figure__source mono">mean · standard deviation</span>
      </header>

      <div className="inference-map">
        <div className="inference-source">
          <p className="architecture-stage__index">Shared input</p>
          <strong>Encoded trial</strong>
          <span>Same representation for every pass</span>
        </div>

        <div className="inference-split" aria-hidden="true" />

        <div className="inference-branches">
          <section
            className="inference-branch"
            aria-labelledby="mc-branch-title"
          >
            <header>
              <span className="mono">MC</span>
              <div>
                <h4 id="mc-branch-title">MC-dropout inference</h4>
                <p>Dropout modules active · BatchNorm remains in eval</p>
              </div>
            </header>
            <ol>
              <li>
                <span>01</span>
                <p>Activate dropout layers</p>
              </li>
              <li>
                <span>02</span>
                <p>Run 500 stochastic evaluations</p>
              </li>
              <li>
                <span>03</span>
                <p>
                  Collect <strong className="mono">500</strong> sigmoid probabilities
                </p>
              </li>
            </ol>
            <div className="inference-output inference-output--split">
              <span>
                Point estimate
                <strong className="mono">Mean probability</strong>
              </span>
              <span>
                Dispersion
                <strong className="mono">Standard deviation</strong>
              </span>
            </div>
          </section>
        </div>
      </div>

      <div className="inference-response" aria-label="Estimate calculation">
        <span className="mono">estimate = mean(p₁ … p₅₀₀)</span>
        <span className="mono">dispersion = standard deviation(p₁ … p₅₀₀)</span>
      </div>

      <figcaption>
        MC σ measures variation under dropout, not a confidence interval,
        calibration result, or probability of error.
      </figcaption>
    </figure>
  );
}
