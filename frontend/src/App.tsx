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
  ExternalLink,
  Mail,
  Github,
  Award,
  Beaker,
  Building2,
} from "lucide-react";

// Import BrowserRouter, Routes, and Route
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AboutPage from "./AboutPage"; // Import the new AboutPage component

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
    modelVersion: "0.2.0",
    lastUpdated: "June 2025",
    datasetSize: "17K+ trials",
    accuracy: "70%",
  });

  const handleSubmit = async () => {
    if (!nctid.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/predict/${nctid}`);
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

  // Enhanced risk assessment with more professional language
  const getRiskLevel = (p: number) => {
    if (p >= 0.725) {
      return {
        level: "High Probability",
        description: "Strong likelihood of trial success based on historical data patterns",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        indicator: "bg-emerald-500",
        confidence: "High",
      };
    }
    if (p >= 0.60) {
      return {
        level: "Moderate-High",
        description: "Above-average success probability with favorable risk profile",
        color: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
        indicator: "bg-green-500",
        confidence: "Moderate-High",
      };
    }
    if (p >= 0.45) {
      return {
        level: "Moderate",
        description: "Balanced risk-reward profile requiring careful evaluation",
        color: "text-yellow-700",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        indicator: "bg-yellow-500",
        confidence: "Moderate",
      };
    }
    if (p >= 0.30) {
      return {
        level: "Below Average",
        description: "Elevated risk factors identified - enhanced due diligence recommended",
        color: "text-orange-700",
        bg: "bg-orange-50",
        border: "border-orange-200",
        indicator: "bg-orange-500",
        confidence: "Low-Moderate",
      };
    }
    return {
      level: "High Risk",
      description: "Significant risk factors present - comprehensive risk assessment advised",
      color: "text-red-700",
      bg: "bg-red-50",
      border: "border-red-200",
      indicator: "bg-red-500",
      confidence: "Low",
    };
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 font-sans flex flex-col">
            {/* Enhanced Header */}
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
                      to="/about" 
                      className="text-slate-700 hover:text-blue-600 font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>About</span>
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </nav>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-4 gap-8">
                
                {/* Main Analysis Panel */}
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/50 p-8 mb-8">
                    <div className="mb-8">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                          <BarChart3 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold text-slate-900">
                            Trial Success Analysis
                          </h2>
                          <p className="text-slate-600 font-medium">
                            AI-powered probability assessment for clinical trial outcomes
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      {/* Enhanced Input Section */}
                      <div className="bg-slate-50 rounded-2xl p-6">
                        <label
                          htmlFor="nctid-input"
                          className="block text-sm font-semibold text-slate-700 mb-3"
                        >
                          Clinical Trial Identifier
                        </label>
                        <div className="relative">
                          <input
                            id="nctid-input"
                            type="text"
                            placeholder="Enter NCTID (e.g., NCT01721746)"
                            value={nctid}
                            onChange={(e) => setNctid(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-xl text-base font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
                          />
                          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                            <Activity className="w-5 h-5 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Submit Button */}
                      <button
                        onClick={handleSubmit}
                        disabled={loading || !nctid.trim()}
                        className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:via-slate-400 disabled:to-slate-500 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl disabled:scale-100 shadow-lg disabled:shadow-none"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center space-x-3">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span className="font-medium">Analyzing Clinical Data...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center space-x-3">
                            <Award className="w-5 h-5" />
                            <span className="font-medium">Generate Investment Analysis</span>
                          </div>
                        )}
                      </button>

                      {/* Enhanced Error Display */}
                      {error && (
                        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-red-900 mb-1">Analysis Error</h4>
                              <p className="text-red-700 font-medium">{error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Enhanced Results Display */}
                      {result && (
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 border-2 border-slate-200">
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                                <Target className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900">
                                Investment Analysis Results
                              </h3>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-full shadow-sm">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">Generated {new Date().toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Trial ID Card */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                  Trial ID
                                </span>
                                <Target className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="text-xl font-bold font-mono text-slate-900 mb-2">
                                {result.nctid}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                ClinicalTrials.gov
                              </div>
                            </div>

                            {/* Success Probability */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                  Success Probability
                                </span>
                                <TrendingUp className={`w-4 h-4 ${getRiskLevel(result.probability).color}`} />
                              </div>
                              <div className={`text-3xl font-bold ${getRiskLevel(result.probability).color} mb-2`}>
                                {(result.probability * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                ±{(result.uncertainty * 100).toFixed(1)}% uncertainty
                              </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                  Risk Category
                                </span>
                                <Shield className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className={`text-lg font-bold ${getRiskLevel(result.probability).color} mb-2`}>
                                {getRiskLevel(result.probability).level}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {getRiskLevel(result.probability).confidence} Confidence
                              </div>
                            </div>

                            {/* Model Confidence */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                                  Model Accuracy
                                </span>
                                <Database className="w-4 h-4 text-slate-400" />
                              </div>
                              <div className="text-3xl font-bold text-blue-600 mb-2">
                                {modelStats.accuracy}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                Validation Accuracy
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Risk Description */}
                          <div className={`p-6 rounded-2xl border-2 ${getRiskLevel(result.probability).bg} ${getRiskLevel(result.probability).border}`}>
                            <div className="flex items-start space-x-4">
                              <div className={`w-3 h-3 rounded-full ${getRiskLevel(result.probability).indicator} mt-2 flex-shrink-0`}></div>
                              <div>
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className={`font-bold text-lg ${getRiskLevel(result.probability).color}`}>
                                    {getRiskLevel(result.probability).level}
                                  </span>
                                </div>
                                <p className="text-slate-700 font-medium leading-relaxed">
                                  {getRiskLevel(result.probability).description}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Sidebar */}
                <div className="space-y-6">
                  {/* Model Performance Metrics */}
                  <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-6">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                      <Database className="w-5 h-5 mr-3 text-blue-600" />
                      Model Performance
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-600">Accuracy</span>
                        <span className="font-bold text-emerald-600 text-lg">{modelStats.accuracy}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-600">Training Data</span>
                        <span className="font-bold text-blue-600">{modelStats.datasetSize}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-600">Model Version</span>
                        <span className="font-bold text-indigo-600">v{modelStats.modelVersion}</span>
                      </div>
                    </div>
                  </div>

                  {/* Recent Analysis */}
                  {recentPredictions.length > 0 && (
                    <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-6">
                      <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                        <Calendar className="w-5 h-5 mr-3 text-green-600" />
                        Recent Analysis
                      </h3>
                      <div className="space-y-3">
                        {recentPredictions.map((pred, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <div className="font-mono text-sm font-bold text-slate-800">
                                {pred.nctid}
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                {pred.timestamp}
                              </div>
                            </div>
                            <div className={`font-bold text-lg ${getRiskLevel(pred.probability).color}`}>
                              {(pred.probability * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Professional Contact Section */}
                  <div className="bg-white rounded-3xl shadow-xl border border-slate-200/50 p-6">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center">
                      <Users className="w-5 h-5 mr-3 text-purple-600" />
                      Platform Resources
                    </h3>
                    <div className="space-y-4">
                      <a
                        href="https://github.com/adourian/lucent"
                        className="flex items-center space-x-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-xl transition-all duration-200 border border-slate-200"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                          <Github className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            Source Code
                          </div>
                          <div className="text-sm text-slate-600 font-medium">
                            Open source repository
                          </div>
                        </div>
                      </a>

                      <a
                        href="mailto:kari.adourian@gmail.com"
                        className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl transition-all duration-200 border border-blue-200"
                      >
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            Contact
                          </div>
                          <div className="text-xs text-slate-600 font-medium">
                            kari.adourian@gmail.com
                          </div>
                        </div>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </main>

            {/* Enhanced Footer */}
            <footer className="bg-white border-t border-slate-200 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col md:flex-row items-center justify-between">
                  <div className="text-sm text-slate-600 font-medium text-center md:text-left mb-4 md:mb-0">
                    Professional-grade clinical trial intelligence for biotech investment decisions
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
        } />
        <Route path="/about" element={<AboutPage modelStats={modelStats} />} />
      </Routes>
    </Router>
  );
}

export default App;