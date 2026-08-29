import AppShell from "./components/AppShell";
import {
  InferenceProtocolDiagram,
  ModelArchitectureDiagram,
} from "./components/ModelDiagrams";

interface AboutPageProps {
  modelStats: {
    modelVersion: string;
    lastUpdated: string;
    datasetSize: string;
  };
}

const sections = [
  ["problem", "Problem"],
  ["data", "Data and representation"],
  ["architecture", "Architecture"],
  ["uncertainty", "Uncertainty"],
  ["limitations", "Scope and limitations"],
  ["freshness", "Freshness"],
  ["source", "Source"],
] as const;

const AboutPage = ({ modelStats }: AboutPageProps) => {
  return (
    <AppShell>
      <main className="model-note" id="main-content">
        <header className="model-note__header">
          <p className="model-note__eyebrow">Model note</p>
          <h1>How Lucent estimates clinical trial outcomes</h1>
          <p className="model-note__lede">
            Lucent retrieves a public trial record from ClinicalTrials.gov,
            encodes selected registry fields, and applies a multimodal neural
            network. The output estimates the probability of a favorable outcome
            at the trial&apos;s current development stage, with MC-dropout variation.
            It is not an observed result or a causal conclusion.
          </p>

          <dl
            className="model-note__summary"
            aria-label="Deployment metadata"
          >
            <div>
              <dt>Model version</dt>
              <dd>v{modelStats.modelVersion}</dd>
            </div>
            <div>
              <dt>Training corpus</dt>
              <dd>{modelStats.datasetSize}</dd>
            </div>
            <div>
              <dt>Inference</dt>
              <dd>500 MC passes</dd>
            </div>
            <div>
              <dt>Output</dt>
              <dd>Mean + MC σ</dd>
            </div>
          </dl>
        </header>

        <div className="model-note__layout">
          <nav className="model-note__toc" aria-label="On this page">
            <p>On this page</p>
            <ol>
              {sections.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="model-note__content">
            <section
              id="problem"
              className="model-note__section"
              aria-labelledby="problem-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                01
              </p>
              <div>
                <h2 id="problem-heading">Problem</h2>
                <p>
                  Lucent estimates the modeled probability of a favorable trial
                  outcome at the study&apos;s current development stage from
                  information available in a ClinicalTrials.gov record. A user
                  supplies an NCT identifier; the service retrieves the record,
                  prepares the supported fields, and runs inference.
                </p>

                <aside className="model-note__callout" aria-label="Target definition">
                  <p>
                    <strong>Target definition.</strong> A positive label represents
                    an outcome classified as successful for the trial&apos;s current
                    development stage. This binary target is not a direct estimate
                    of regulatory approval or overall clinical benefit.
                  </p>
                </aside>
              </div>
            </section>

            <section
              id="data"
              className="model-note__section"
              aria-labelledby="data-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                02
              </p>
              <div>
                <h2 id="data-heading">Data and feature representation</h2>
                <p>
                  At inference time, Lucent retrieves the public trial record from
                  ClinicalTrials.gov. Five text representations and an eight-position
                  trial-phase vector enter the deployed network; the phase vector is
                  one-hot when its value is recognized.
                </p>

                <div
                  className="model-note__table-scroll"
                  role="region"
                  aria-label="Model input representations"
                  tabIndex={0}
                >
                  <table className="model-note__table">
                    <thead>
                      <tr>
                        <th scope="col">Registry field</th>
                        <th scope="col">Preparation</th>
                        <th scope="col">Representation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th scope="row">Lead sponsor</th>
                        <td>Sponsor name as text</td>
                        <td>all-MiniLM-L6-v2, 384 dimensions</td>
                      </tr>
                      <tr>
                        <th scope="row">Conditions</th>
                        <td>Cleaned and joined into one string</td>
                        <td>MedBERT CLS embedding, 768 dimensions</td>
                      </tr>
                      <tr>
                        <th scope="row">Brief summary</th>
                        <td>Trimmed protocol summary</td>
                        <td>BioSimCSE-BioLinkBERT, 768 dimensions</td>
                      </tr>
                      <tr>
                        <th scope="row">Eligibility criteria</th>
                        <td>Cleaned and split into inclusion and exclusion text</td>
                        <td>Two BioSimCSE-BioLinkBERT representations</td>
                      </tr>
                      <tr>
                        <th scope="row">Trial phase</th>
                        <td>Normalized category</td>
                        <td>Eight-position vector; one-hot when recognized</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <aside className="model-note__callout" aria-label="Context fields">
                  <p>
                    <strong>Report context, not model input.</strong> Trial title,
                    status, enrollment, and completion date are returned for
                    display but are not passed into the prediction network.
                  </p>
                </aside>
              </div>
            </section>

            <section
              id="architecture"
              className="model-note__section"
              aria-labelledby="architecture-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                03
              </p>
              <div>
                <h2 id="architecture-heading">Architecture</h2>
                <p>
                  Five modality-specific towers encode the text fields, while a
                  separate branch represents trial phase. The diagram summarizes
                  how those paths are combined to produce the estimate.
                </p>

                <ModelArchitectureDiagram />
              </div>
            </section>

            <section
              id="uncertainty"
              className="model-note__section"
              aria-labelledby="uncertainty-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                04
              </p>
              <div>
                <h2 id="uncertainty-heading">Uncertainty estimation</h2>
                <p>
                  The prediction service enables dropout and evaluates 500
                  stochastic copies of the same encoded trial. Their mean is the
                  estimate presented in the report; their standard deviation is
                  presented as MC-dropout dispersion.
                </p>
                <InferenceProtocolDiagram />
                <dl className="model-note__definitions">
                  <div>
                    <dt>MC probability</dt>
                    <dd>
                      The arithmetic mean of 500 stochastic sigmoid outputs. This
                      is the estimate presented in the report.
                    </dd>
                  </div>
                  <div>
                    <dt>Uncertainty</dt>
                    <dd>
                      The standard deviation of those 500 outputs, presented as
                      MC-dropout dispersion alongside the estimate.
                    </dd>
                  </div>
                </dl>
                <p>
                  The standard deviation captures how much the output moves with
                  dropout active; it is not a formal confidence interval.
                </p>
              </div>
            </section>

            <section
              id="limitations"
              className="model-note__section"
              aria-labelledby="limitations-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                05
              </p>
              <div>
                <h2 id="limitations-heading">Scope and limitations</h2>
                <ul className="model-note__list">
                  <li>
                    Lucent estimates a binary favorable-outcome target for the
                    trial&apos;s current development stage. It does not directly
                    estimate regulatory approval or overall clinical benefit.
                  </li>
                  <li>
                    An estimate reflects the registry record available when it was
                    generated. Later record updates are not automatically
                    incorporated into cached results.
                  </li>
                  <li>
                    The model uses only the representations listed above. Trial
                    status, enrollment, completion date, and financial data do
                    not enter the network.
                  </li>
                  <li>
                    Lucent reports the estimate and dropout variation; it does not
                    infer causal drivers or trial-specific explanations.
                  </li>
                </ul>
                <p className="model-note__disclaimer">
                  Lucent is a research prototype. Its outputs are not medical or
                  investment advice.
                </p>
              </div>
            </section>

            <section
              id="freshness"
              className="model-note__section"
              aria-labelledby="freshness-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                06
              </p>
              <div>
                <h2 id="freshness-heading">Data and model freshness</h2>
                <dl className="model-note__definitions">
                  <div>
                    <dt>Trial record</dt>
                    <dd>
                      ClinicalTrials.gov supplies the registry data used for
                      analysis. A result reflects the record available to Lucent
                      for that prediction.
                    </dd>
                  </div>
                  <div>
                    <dt>Cached analysis</dt>
                    <dd>
                      Predictions may be served from cache and are not automatically
                      recomputed when a registry record changes.
                    </dd>
                  </div>
                  <div>
                    <dt>Deployed model</dt>
                    <dd>
                      Predictions use version {modelStats.modelVersion}, trained on
                      {` ${modelStats.datasetSize}`}, until a newer model is deployed.
                      The recorded update is {modelStats.lastUpdated}.
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <section
              id="source"
              className="model-note__section"
              aria-labelledby="source-heading"
            >
              <p className="model-note__section-index" aria-hidden="true">
                07
              </p>
              <div>
                <h2 id="source-heading">Source and further detail</h2>
                <p>
                  The application source contains the deployed API, preprocessing,
                  network definition, weights, and interface. The separate modeling
                  repository documents the model-development and training work.
                </p>
                <ul className="model-note__sources">
                  <li>
                    <a
                      href="https://github.com/adourian/lucent"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Lucent application source
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/adourian/Clinical-Trial-Outcomes"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Model-development repository
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://clinicaltrials.gov/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ClinicalTrials.gov
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </article>
        </div>
      </main>
    </AppShell>
  );
};

export default AboutPage;
