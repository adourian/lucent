import { Database, BarChart3, Target, ArrowLeft, Beaker, Building2, Brain, Cpu, TrendingUp, Shield, Globe2 } from "lucide-react";
import { Link } from "react-router-dom";
import architectureImage from "./assets/architecture.png";

interface AboutPageProps {
  modelStats: {
    avgProcessingTime: number;
    modelVersion: string;
    lastUpdated: string;
    datasetSize: string;
    accuracy: string;
  };
}

const AboutPage = ({ modelStats }: AboutPageProps) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans">
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Beaker className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                  Lucent
                </h1>
                <p className="text-sm text-slate-600 -mt-1 font-medium">
                  Clinical Intelligence Platform
                </p>
              </div>
            </div>

            <nav className="flex items-center space-x-8">
              <Link 
                to="/" 
                className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Analysis</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Advanced AI for Clinical Trial Intelligence
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Leveraging state-of-the-art machine learning to deliver actionable insights 
            for biotech investment decisions with quantified uncertainty.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Globe2 className="w-6 h-6 text-white" />
            </div>
            <div className="text-2xl font-bold text-indigo-600 mb-1">Universal</div>
            <div className="text-sm font-medium text-slate-600">
              Works on any trial with a valid NCTID
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-green-600 mb-1">{modelStats.datasetSize}</div>
            <div className="text-sm font-medium text-slate-600">Training Dataset</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-1">v{modelStats.modelVersion}</div>
            <div className="text-sm font-medium text-slate-600">Model Version</div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-1">{modelStats.avgProcessingTime}s</div>
            <div className="text-sm font-medium text-slate-600">Processing Time</div>
          </div>
        </div>

        {/* Technical Sections */}
        <div className="space-y-12">
          {/* Feature Engineering */}
          <section className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mr-4">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Intelligent Feature Engineering</h3>
                <p className="text-slate-600 font-medium">Multi-modal data processing pipeline</p>
              </div>
            </div>
            
            <p className="text-slate-700 leading-relaxed mb-6 text-lg">
              Clinical trials are parsed from ClinicalTrials.gov and processed using a sophisticated 
              multi-stage pipeline. Structured fields undergo domain-specific embedding while 
              unstructured text is encoded using state-of-the-art biomedical transformers.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Structured Data</h4>
                <ul className="text-slate-700 space-y-2">
                  <li>• Sponsor embeddings via MedBERT</li>
                  <li>• Disease classification with ChemBERTa</li>
                  <li>• Trial phase one-hot encoding</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Unstructured Text</h4>
                <ul className="text-slate-700 space-y-2">
                  <li>• Eligibility criteria via BioSimCSE</li>
                  <li>• Protocol summaries encoded</li>
                  <li>• Contextual embeddings preserved</li>
                </ul>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="font-bold text-slate-900 mb-3">Feature Fusion</h4>
                <ul className="text-slate-700 space-y-2">
                  <li>• Multi-modal representation learning</li>
                  <li>• Attention-based feature weighting</li>
                  <li>• Dimensional consistency enforcement</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Architecture Diagram */}
          <section className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mr-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Neural Network Architecture</h3>
                <p className="text-slate-600 font-medium">Multi-tower deep learning framework</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border-2 border-slate-200">
              <figure className="text-center">
                <img
                  src={architectureImage}
                  alt="Lucent model architecture"
                  className="max-w-full h-auto mx-auto rounded-xl shadow-lg"
                  style={{ maxHeight: "500px", objectFit: "contain" }}
                />
                <figcaption className="text-sm text-slate-600 mt-4 font-medium max-w-3xl mx-auto">
                  Multi-modal neural network with specialized towers for different data types, 
                  attention-based fusion, and uncertainty quantification through Monte Carlo dropout.
                </figcaption>
              </figure>
            </div>
          </section>

          {/* Deep Learning Architecture */}
          <section className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Deep Learning Architecture</h3>
                <p className="text-slate-600 font-medium">Advanced neural network design</p>
              </div>
            </div>
            
            <p className="text-slate-700 leading-relaxed mb-6 text-lg">
              The core architecture employs a multi-tower neural network with five independent 
              processing streams for sponsor, disease, inclusion criteria, exclusion criteria, 
              and protocol summaries. These representations are dynamically fused through learned 
              attention mechanisms.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-xl font-bold text-slate-900">Architecture Components</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Specialized Towers</div>
                      <div className="text-slate-600">Dedicated processing paths with dropout, batch normalization, and non-linearities</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Attention Fusion</div>
                      <div className="text-slate-600">Learned attention weights dynamically prioritize information sources</div>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <div className="font-semibold text-slate-900">Prediction Head</div>
                      <div className="text-slate-600">Final classification layer with sigmoid activation for probability output</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <h4 className="text-xl font-bold text-slate-900 mb-4">Training Details</h4>
                <div className="space-y-3 text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-medium">Dataset Size:</span>
                    <span className="font-bold text-blue-600">{modelStats.datasetSize}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Validation Accuracy:</span>
                    <span className="font-bold text-emerald-600">{modelStats.accuracy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Last Updated:</span>
                    <span className="font-bold text-purple-600">{modelStats.lastUpdated}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Prediction & Uncertainty */}
          <section className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mr-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Prediction & Uncertainty Quantification</h3>
                <p className="text-slate-600 font-medium">Probabilistic forecasting with confidence intervals</p>
              </div>
            </div>
            
            <p className="text-slate-700 leading-relaxed mb-6 text-lg">
              Beyond point estimates, Lucent provides uncertainty quantification through Monte Carlo 
              dropout sampling. This enables risk-aware decision making by quantifying model confidence 
              in each prediction, critical for high-stakes investment decisions.
            </p>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <h4 className="font-bold text-emerald-900 mb-3">Deterministic Prediction</h4>
                <p className="text-emerald-800">
                  Standard forward pass providing point estimate of trial success probability
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <h4 className="font-bold text-blue-900 mb-3">Monte Carlo Sampling</h4>
                <p className="text-blue-800">
                  Multiple stochastic forward passes with dropout enabled to estimate uncertainty
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                <h4 className="font-bold text-purple-900 mb-3">Risk Assessment</h4>
                <p className="text-purple-800">
                  Standard deviation used as confidence proxy for investment risk evaluation
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-white border-t border-slate-200 shadow-lg mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-slate-600 font-medium text-center md:text-left mb-4 md:mb-0">
              Advanced machine learning for biotech investment intelligence
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-500">
              <span className="font-medium">© 2025 Lucent Platform</span>
              <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
              <span className="font-medium">MIT License</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;