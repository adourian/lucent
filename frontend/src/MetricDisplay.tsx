import React from 'react';

interface MetricDisplayProps {
  label: string;
  value: string | number | null | undefined; // Allow for formatted string, number, or null/undefined
  tooltip: string;
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ label, value, tooltip }) => {
  return (
    <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100 transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:border-blue-300 relative overflow-hidden">
      {/* Subtle gradient overlay on hover (lighter version) */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-10"></div>
      
      <div className="flex items-center justify-between mb-1 relative z-10">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
        {/* Tooltip Icon */}
        <span className="text-slate-400 cursor-help" title={tooltip}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      </div>
      <p className="text-2xl font-bold text-blue-700 relative z-10"> {/* Changed to a strong blue for values */}
        {value === null || value === undefined || value === 'N/A' || value === '' ? 
          <span className="text-slate-400 italic text-xl">N/A</span> 
          : value
        }
      </p>
      {/* Add subtle sparkline/trend indicator here if applicable */}
    </div>
  );
};

export default MetricDisplay;