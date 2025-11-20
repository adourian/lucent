import { useState, useEffect } from "react";
import React from 'react';
import { sponsorToTicker } from "./sponsor_to_tickr";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import {
  TrendingUp,
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
import AboutPage from "./AboutPage"; 
import MetricDisplay from "./MetricDisplay";

function App() {
  // State variables for stock data and analysis
  const [stockData, setStockData] = useState<{ date: string; close: number }[] | null>(null);
  const [stockMetadata, setStockMetadata] = useState<{ [key: string]: any } | null>(null);
  const [stockRange, setStockRange] = useState("6mo");
  const [stockError, setStockError] = useState<string | null>(null);
  const [currentTicker, setCurrentTicker] = useState<string | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  // State variables for analysis input and results
  const [nctid, setNctid] = useState("");
  const [result, setResult] = useState<{
    probability: number;
    uncertainty: number;
    nctid: string;
    phase: string;
    sponsor: string | null;
    title?: string;
    diseases?: string;
    enrollment?: string;
    completion_date?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState<
    { nctid: string; probability: number; timestamp: string }[]
  >([]);

  const [modelStats] = useState({
    avgProcessingTime: 20,
    modelVersion: "0.3.0",
    lastUpdated: "July 2025",
    datasetSize: "33K+ trials",
    accuracy: "70%",
  });

  useEffect(() => {
    const fetchStockData = async () => {
      if (!currentTicker) return;

      setStockLoading(true);

      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE}/finance/${currentTicker}?range=${stockRange}&interval=1d`);
        const finance = await res.json();

        if (finance.prices && finance.prices.length > 0) {
          setStockData(finance.prices);
          setStockMetadata(finance.metadata || null); // <- New line to store metadata
          setStockError(null);
        } else {
          setStockData(null);
          setStockMetadata(null);
          setStockError("No price data available");
        }
      } catch (err) {
        console.error("Stock fetch error:", err);
        setStockData(null);
        setStockMetadata(null);
        setStockError("Error loading stock data");
      } finally {
        setStockLoading(false);
      }
    };

    fetchStockData();
  }, [stockRange, currentTicker]);

  const handleSubmit = async () => {
    if (!nctid.trim()) return;
    setLoading(true);
    setError(null); 

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}/predict/${nctid}`);
      const data = await res.json();
      
      if (data.error) {
        setError("Analysis failed. Please verify the NCTID and try again.");
        return;
      }

      const newResult = {
        probability: data.deterministic,
        uncertainty: data.uncertainty,
        nctid: data.nctid,
        phase: data.phase,
        sponsor: data.sponsor || "N/A",
        title: data.title || "",
        diseases: data.diseases || "",
        enrollment: data.enrollment || "",
        completion_date: data.completion_date || "",
      };
      setResult(newResult);

      const ticker = getTicker(data.sponsor);
      setCurrentTicker(ticker);
      if (ticker) {
        try {
          const res = await fetch(`${import.meta.env.VITE_API_BASE}/finance/${ticker}?range=${stockRange}&interval=1d`);

          if (!res.ok) {
            // If the backend raises HTTPException(404) or any other HTTP error
            const errorData = await res.json(); // Attempt to parse error message from backend
            throw new Error(errorData.detail || `Failed to fetch financial data: ${res.statusText}`);
          }

          const finance = await res.json();

          // --- Handle Stock Chart Data ---
          if (finance.prices && finance.prices.length > 0) {
            setStockData(finance.prices);
          } else {
            setStockData(null); // No price data, clear chart
          }

          // --- Handle Stock Metadata ---
          // The backend always returns a 'metadata' object, even if values are null.
          // We set stockMetadata to this object, and the JSX conditional will check its content.
          if (finance.metadata) {
            setStockMetadata(finance.metadata);
          } else {
            setStockMetadata(null); // Should theoretically not happen if backend always returns an object, but good for safety
          }
          
          // Clear any previous stock error if data was successfully fetched
          setStockError(null);

        } catch (err: any) {
          console.error("Financial data fetch error:", err);
          setStockData(null); // Clear chart data on error
          setStockMetadata(null); // Clear metadata on error
          setStockError(err.message || "Error loading financial data.");
        } finally {
          setStockLoading(false);
        }
      } else {
        // If no ticker is found for the sponsor
        setStockData(null); // Clear stock chart data
        setStockMetadata(null); // Clear financial metadata
        setStockError("No public ticker found for this sponsor.");
      }

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

  // Risk assessment
  const getRiskLevel = (p: number) => {
    if (p >= 0.75) {
      return {
        level: "High Probability",
        description: "Strong likelihood of trial success based on historical data patterns",
        color: "text-emerald-700",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        indicator: "bg-emerald-500",
        confidence: "High",
        gradient: "from-emerald-400 to-teal-500",
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
        gradient: "from-lime-300 to-green-500",
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
        gradient: "from-yellow-300 to-yellow-500",
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
        gradient: "from-orange-300 to-orange-500",
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
      gradient: "from-red-400 to-red-600",
    };
  };

  function getTicker(sponsor: string | null) {
    if (!sponsor) return null;
    // Try to find a case-insensitive match
    const found = Object.keys(sponsorToTicker).find(
      key => key.trim().toLowerCase() === sponsor.trim().toLowerCase()
    );
    return found ? sponsorToTicker[found] : null;
  }

  function formatLargeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return "N/A";

    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;

    return `${sign}$${abs.toFixed(0)}`;
  }

  function formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(value)) return "N/A";
    return `${(value * 100).toFixed(1)}%`;
  }
  

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
                        <label htmlFor="nctid-input" className="block text-sm font-semibold text-slate-700 mb-3 flex items-center space-x-2">
                          <span>Clinical Trial Identifier</span>
                          <div className="relative group">
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-300 text-white text-[10px] font-bold leading-none cursor-pointer">
                              ?
                            </span>
                            <div className="absolute left-5 top-1/2 transform -translate-y-1/2 ml-2 w-64 p-3 bg-white border border-slate-200 shadow-lg rounded-xl text-xs text-slate-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                              An NCTID (e.g., NCT02654054) is a unique identifier for clinical trials registered at <a href="https://clinicaltrials.gov/" target="_blank" className="text-blue-600 underline">ClinicalTrials.gov</a>.
                            </div>
                          </div>
                        </label>
                        <div className="relative">
                          <input
                            id="nctid-input"
                            type="text"
                            placeholder="Enter NCTID (e.g., NCT02654054)"
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

                      {/* Submit Button */}
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
                            <span className="font-medium">Generate Analysis</span>
                          </div>
                        )}
                      </button>

                      {/* Wait Time Display */}
                      {loading && (
                        <div className="text-sm text-slate-500 font-medium text-center mt-3">
                          Can take some time...
                        </div>
                      )}

                      {/* Error Display */}
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
          

                      {/* Results Display */}
                      {result && (
                        <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl p-8 border-2 border-slate-200">
                          
                          {/* Header */}
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
                                <BarChart3 className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900">Analysis Results</h3>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="font-light">Generated</span>
                              <span className="font-medium text-sm">{new Date().toLocaleTimeString()}</span>
                            </div>
                          </div>

                          {/* Key Metrics */}
                          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {/* Trial ID */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase">Trial ID</span>
                                <Target className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="text-lg font-mono text-slate-900">{result.nctid}</div>
                              <div className="text-xs text-slate-500 mt-1">ClinicalTrials.gov</div>
                            </div>

                            {/* Success Probability */}
                            <div className={`bg-white rounded-2xl p-6 border-2 shadow-md ${getRiskLevel(result.probability).border}`}>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase">Success Probability</span>
                                <TrendingUp className={`w-4 h-4 ${getRiskLevel(result.probability).color}`} />
                              </div>
                              <div className={`text-3xl font-bold bg-gradient-to-r ${getRiskLevel(result.probability).gradient} text-transparent bg-clip-text`}>
                                {(result.probability * 100).toFixed(1)}%
                              </div>
                              <div className="text-xs text-slate-500 font-medium">
                                ±{(result.uncertainty * 100).toFixed(1)}% uncertainty
                              </div>
                            </div>

                            {/* Sponsor */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase">Sponsor</span>
                                <Building2 className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="text-base font-semibold text-slate-900 break-words">{result.sponsor}</div>
                              <div className="text-xs text-slate-500 mt-1">Trial owner</div>
                            </div>

                            {/* Trial Phase */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-slate-600 uppercase">Trial Phase</span>
                                <Beaker className="w-4 h-4 text-blue-400" />
                              </div>
                              <div className="text-lg font-bold text-slate-900 capitalize">{result.phase || "N/A"}</div>
                              <div className="text-xs text-slate-500 mt-1">Clinical development stage</div>
                            </div>
                          </div>

                          {/* Risk Panel */}
                          <div className={`p-6 rounded-2xl border-2 ${getRiskLevel(result.probability).bg} ${getRiskLevel(result.probability).border} mb-6`}>
                            <div className="flex items-start space-x-4">
                              <div className={`w-5 h-5 rounded-full ${getRiskLevel(result.probability).indicator} mt-1 ring-1 ring-current ring-opacity-50`} />
                              <div>
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className={`font-bold text-lg ${getRiskLevel(result.probability).color}`}>
                                    {getRiskLevel(result.probability).level}
                                  </span>
                                </div>
                                <p className="text-slate-700 font-semibold leading-relaxed">
                                  {getRiskLevel(result.probability).description}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Trial Title */}
                          <div className="max-w-3xl mx-auto mb-6">
                            <div className="text-center">
                              <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Trial Title</div>
                            </div>
                            <p className="text-sm text-slate-800 leading-snug text-center">{result.title}</p>
                          </div>

                          {/* Metadata Grouped */}
                          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
                            <div className="grid sm:grid-cols-2 gap-4 text-center sm:text-left">
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Disease(s)</div>
                                <div className="text-sm font-medium text-slate-800">{result.diseases}</div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Enrollment</div>
                                <div className="text-sm font-medium text-slate-800">{result.enrollment || "N/A"}</div>
                              </div>
                            </div>
                          </div>

                          {/* Stock Chart */}
                          {getTicker(result.sponsor) && (
                            <div className="bg-white rounded-2xl p-6 shadow-md border border-sky-400">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-slate-600 uppercase">Stock Price Chart</span>
                                  <span className="text-xs text-blue-500 font-semibold mt-0.5">
                                    Ticker: <span className="text-blue-700 font-bold">{getTicker(result.sponsor)}</span>
                                  </span>
                                </div>
                                <select
                                  value={stockRange}
                                  onChange={(e) => setStockRange(e.target.value)}
                                  disabled={stockLoading}
                                  className="text-sm border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-100 focus:ring-2 focus:ring-sky-300"
                                >
                                  {["5d", "1mo", "3mo", "6mo", "1y", "5y", "10y", "max"].map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>

                              {/* Conditional rendering based on loading, data, and error */}
                              {stockLoading ? ( // Show a loading state
                                <div className="flex items-center justify-center h-48 text-sky-600">
                                  <svg className="animate-spin h-8 w-8 mr-3 text-sky-500" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  <span>Loading stock data...</span>
                                </div>
                              ) : stockData ? (
                                <ResponsiveContainer width="100%" height={200}>
                                  <LineChart data={stockData}>
                                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} domain={["auto", "auto"]} />
                                    <Tooltip />
                                    <Line
                                      type="monotone"
                                      dataKey="close"
                                      stroke="#00C8FF"
                                      strokeWidth={3}
                                      dot={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              ) : (
                                <p className="text-sm text-red-500 mt-2 text-center">{stockError || "No stock data available for this selection."}</p> // Slightly larger error text, centered
                              )}
                            </div>
                          )}
                          {stockMetadata && (
                            <div className="mt-12 bg-white rounded-3xl p-8 shadow-xl border border-slate-100 overflow-hidden relative"> {/* Lightened outer container */}

                              <h3 className="text-center text-3xl font-extrabold text-slate-800 mb-8 tracking-tight relative z-10"> {/* Stronger contrast for title */}
                                Sponsor Financial Snapshot
                              </h3>

                              {Object.values(stockMetadata).some((val) => val !== null && val !== undefined) ? (
                                <div className="space-y-10 relative z-10"> {/* Increased spacing */}
                                  
                                  {/* Valuation */}
                                  {(stockMetadata.marketCap || stockMetadata.enterpriseValue || stockMetadata.trailingPE) && (
                                    <section className="group">
                                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 transition-colors duration-300 group-hover:text-blue-600"> {/* Accent on hover */}
                                        Valuation
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stockMetadata.marketCap && (
                                          <MetricDisplay label="Market Cap" value={formatLargeNumber(stockMetadata.marketCap)} tooltip="Total value of the company's outstanding shares." />
                                        )}
                                        {stockMetadata.enterpriseValue && (
                                          <MetricDisplay label="Enterprise Value" value={formatLargeNumber(stockMetadata.enterpriseValue)} tooltip="Total value of a company, including market capitalization, debt, and minority interest, minus cash and cash equivalents." />
                                        )}
                                        {stockMetadata.trailingPE && (
                                          <MetricDisplay label="P/E (TTM)" value={stockMetadata.trailingPE !== null ? stockMetadata.trailingPE.toFixed(2) : 'N/A'} tooltip="Trailing twelve months Price-to-Earnings ratio. Indicates how much investors are willing to pay per dollar of earnings." />
                                        )}
                                      </div>
                                    </section>
                                  )}

                                  {/* Revenue & Profitability */}
                                  {(stockMetadata.totalRevenue || stockMetadata.profitMargins || stockMetadata.returnOnEquity) && (
                                    <section className="group">
                                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 transition-colors duration-300 group-hover:text-blue-600">
                                        Revenue & Profitability
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stockMetadata.totalRevenue && (
                                          <MetricDisplay label="Total Revenue" value={formatLargeNumber(stockMetadata.totalRevenue)} tooltip="Total amount of income generated by the sale of goods or services related to the company's primary operations." />
                                        )}
                                        {stockMetadata.profitMargins !== null && stockMetadata.profitMargins !== undefined && (
                                          <MetricDisplay label="Profit Margin" value={formatPercentage(stockMetadata.profitMargins)} tooltip="Percentage of revenue left after all expenses, including taxes, have been deducted from sales." />
                                        )}
                                        {stockMetadata.returnOnEquity !== null && stockMetadata.returnOnEquity !== undefined && (
                                          <MetricDisplay label="Return on Equity" value={stockMetadata.returnOnEquity.toFixed(2) + '%'} tooltip="Amount of net income returned as a percentage of shareholders equity. Measures profitability in relation to shareholder investments." />
                                        )}
                                      </div>
                                    </section>
                                  )}

                                  {/* Liquidity & Risk */}
                                  {(stockMetadata.currentRatio || stockMetadata.beta || stockMetadata.dividendYield) && (
                                    <section className="group">
                                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 transition-colors duration-300 group-hover:text-blue-600">
                                        Liquidity & Risk
                                      </h4>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {stockMetadata.currentRatio && (
                                          <MetricDisplay label="Current Ratio" value={stockMetadata.currentRatio !== null ? stockMetadata.currentRatio.toFixed(2) : 'N/A'} tooltip="Measures a company's ability to pay off its short-term liabilities with its short-term assets." />
                                        )}
                                        {stockMetadata.beta && (
                                          <MetricDisplay label="Beta" value={stockMetadata.beta !== null ? stockMetadata.beta.toFixed(2) : 'N/A'} tooltip="Measures the volatility of a stock relative to the overall market." />
                                        )}
                                        {stockMetadata.dividendYield !== null && stockMetadata.dividendYield !== undefined && (
                                          <MetricDisplay label="Dividend Yield" value={`${(stockMetadata.dividendYield).toFixed(2)}%`} tooltip="Ratio of a company's annual dividend per share compared to its share price. Represents the return on investment for a stock." />
                                        )}
                                      </div>
                                    </section>
                                  )}
                                </div>
                              ) : (
                                <div className="text-md text-center text-slate-500 italic mt-8 p-4 bg-slate-50 rounded-lg border border-slate-200 relative z-10"> {/* Lightened empty state */}
                                  Financial data not available for this sponsor. This may be due to the company being private, newly formed, or not publicly listed.
                                  <p className="mt-2 text-xs text-slate-400">
                                    (Note: This section is displayed only when financial data exists.)
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
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
                      Model Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-slate-600">Universal</span>
                        <span className="font-bold text-emerald-600">Any NCTID</span>
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
                    Clinical trial intelligence for biotech investment decisions
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