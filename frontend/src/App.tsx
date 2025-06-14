import { useState } from "react";
import {
  TrendingUp,
  Shield,
  Database,
  Clock,
  AlertTriangle,
  Activity,
  BarChart3,
  Target,
  Users,
  Calendar,
} from "lucide-react";

function App() {
  const [nctid, setNctid] = useState("");
  const [result, setResult] = useState<{
    probability: number;
    uncertainty: number;
    nctid: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState<
    { nctid: string; probability: number; timestamp: string }[]
  >([]);

  const [modelStats] = useState({
    avgProcessingTime: 10,
    modelVersion: "2.1.4",
    lastUpdated: "June 2025",
    datasetSize: "17K+ trials",
  });

  const handleSubmit = async () => {
    if (!nctid.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`http://127.0.0.1:8000/predict/${nctid}`);
      const data = await res.json();

      if (data.error) {
        setError("Analysis failed. Please verify the NCTID format and try again.");
        return;
      }

      const newResult = {
        probability: data.deterministic,
        uncertainty: data.uncertainty,
        nctid: data.nctid,
      };
      setResult(newResult);

      const newPrediction = {
        nctid: data.nctid,
        probability: data.deterministic,
        timestamp: new Date().toLocaleTimeString(),
      };
      setRecentPredictions((prev) => [newPrediction, ...prev.slice(0, 4)]);

      return;
    } catch (e) {
      setError("Connection error. Please ensure the prediction service is available.");
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  const getRiskLevel = (p: number) => {
    if (p >= 0.7) {
      return {
        level: "Excellent Odds",
        color: "text-green-600",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    }
    if (p >= 0.55) {
      return {
        level: "Good Odds",
        color: "text-green-400",
        bg: "bg-green-50",
        border: "border-green-200",
      };
    }
    if (p >= 0.45) {
      return {
        level: "Uncertain",
        color: "text-yellow-500",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
      };
    }
    if (p >= 0.3) {
      return {
        level: "Elevated Risk",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
      };
    }
    return {
      level: "High Risk",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Lucent
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 -mt-1">
                  Clinical Intelligence Platform
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-xs sm:text-sm text-gray-600">
              <button className="relative group flex items-center space-x-2 hover:text-blue-600 transition-colors">
                <span>About</span>
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 origin-left transform scale-x-0 transition-transform group-hover:scale-x-100"></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Main Prediction Panel */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6 sm:p-8">
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Trial Success Prediction
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Advanced AI–powered analysis of clinical trial success probability
                </p>
              </div>
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <label
                    htmlFor="nctid-input"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Clinical Trial Identifier (NCTID)
                  </label>
                  <div className="relative">
                    <input
                      id="nctid-input"
                      type="text"
                      placeholder="Enter NCTID (e.g., NCT01721746)"
                      value={nctid}
                      onChange={(e) => setNctid(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-3 py-3 sm:px-4 sm:py-4 bg-gray-50 border border-gray-300 rounded-xl text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                      <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !nctid.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:scale-100 shadow-lg disabled:shadow-none"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Analyzing Trial Data...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <BarChart3 className="w-4 sm:w-5 h-4 sm:h-5" />
                      <span>Generate Prediction</span>
                    </div>
                  )}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                    <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-red-800">Analysis Error</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                )}

                {result && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                        Prediction Results
                      </h3>
                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-600">
                        <Clock className="w-3 sm:w-4 h-3 sm:h-4" />
                        <span>Generated {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-4 sm:gap-6">
                      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            Trial Identifier
                          </span>
                          <Target className="w-3 sm:w-4 h-3 sm:h-4 text-gray-400" />
                        </div>
                        <div className="text-lg sm:text-xl font-mono font-bold text-gray-900">
                          {result.nctid}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            Success Probability
                          </span>
                          <TrendingUp
                            className={`w-3 sm:w-4 h-3 sm:h-4 ${getRiskLevel(
                              result.probability
                            ).color}`}
                          />
                        </div>
                        <div
                          className={`text-2xl sm:text-3xl md:text-4xl font-bold ${
                            getRiskLevel(result.probability).color
                          }`}
                        >
                          {(result.probability * 100).toFixed(1)}%
                        </div>
                        <div className="mt-2 text-xs sm:text-sm text-gray-600">
                          ± {(result.uncertainty * 100).toFixed(1)}% uncertainty
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <span className="text-xs sm:text-sm font-medium text-gray-600">
                            Risk Assessment
                          </span>
                          <Shield className="w-3 sm:w-4 h-3 sm:h-4 text-gray-400" />
                        </div>
                        <div
                          className={`text-base sm:text-lg font-bold ${
                            getRiskLevel(result.probability).color
                          }`}
                        >
                          {getRiskLevel(result.probability).level}
                        </div>
                        <div className="mt-2 text-xs sm:text-sm text-gray-600">
                          Model confidence level
                        </div>
                      </div>
                    </div>

                    <div
                      className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl border ${
                        getRiskLevel(result.probability).bg
                      } ${getRiskLevel(result.probability).border}`}
                    >
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            getRiskLevel(result.probability).color.replace(
                              "text-",
                              "bg-"
                            )
                          }`}
                        ></div>
                        <span
                          className={`font-semibold ${
                            getRiskLevel(result.probability).color
                          }`}
                        >
                          {getRiskLevel(result.probability).level}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 mt-2">
                        {result.probability >= 0.7
                          ? "This trial shows exceptionally high odds of success."
                          : result.probability >= 0.55
                          ? "This trial has good odds of success."
                          : result.probability >= 0.45
                          ? "This trial outcome is uncertain."
                          : result.probability >= 0.3
                          ? "This trial presents elevated risk factors."
                          : "This trial exhibits high risk of failure. Consider additional due diligence."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 max-h-[calc(100vh-12rem)] overflow-auto">
            {/* Model Information */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Database className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                Model Information
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">
                    Processing Time
                  </span>
                  <span className="font-bold text-indigo-600">
                    {modelStats.avgProcessingTime}s
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Model Version</span>
                  <span className="font-bold text-blue-600">
                    v{modelStats.modelVersion}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Last Updated</span>
                  <span className="font-bold text-emerald-600">
                    {modelStats.lastUpdated}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-gray-600">Training Data</span>
                  <span className="font-bold text-purple-600">
                    {modelStats.datasetSize}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Predictions */}
            {recentPredictions.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Calendar className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                  Recent Analysis
                </h3>
                <div className="space-y-3">
                  {recentPredictions.map((pred, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-mono text-xs sm:text-sm text-gray-800">
                          {pred.nctid}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pred.timestamp}
                        </div>
                      </div>
                      <div
                        className={`font-bold text-xs sm:text-sm ${
                          getRiskLevel(pred.probability).color
                        }`}
                      >
                        {(pred.probability * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact & Links */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <Users className="w-4 sm:w-5 h-4 sm:h-5 mr-2" />
                Connect & Contribute
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <a
                  href="https://github.com/yourusername/lucent"
                  className="flex items-center space-x-3 p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="w-7 sm:w-8 h-7 sm:h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-bold">GH</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      GitHub Repository
                    </div>
                    <div className="text-xs text-gray-600">
                      Open source code & docs
                    </div>
                  </div>
                </a>

                <a
                  href="mailto:contact@lucent.ai"
                  className="flex items-center space-x-3 p-2 sm:p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-7 sm:w-8 h-7 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs">✉</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      Get in Touch
                    </div>
                    <div className="text-xs text-gray-600">
                      contact@lucent.ai
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
              Open source clinical trial success prediction powered by machine learning
            </div>
            <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-right mt-2 sm:mt-0">
              © 2025 Lucent. MIT License.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

