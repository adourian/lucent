// lucent_frontend.jsx
import React, { useState } from 'react';
import axios from 'axios';

const LucentApp = () => {
  const [nctid, setNctid] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchPrediction = async () => {
    if (!nctid.trim()) {
      setError("Please enter a valid NCTID.");
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:8000/predict/${nctid}`);
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      setResult(response.data);
      setError(null);
    } catch (err) {
      setError("Prediction failed. Trial not found or invalid NCTID.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', padding: 24, border: '1px solid #ccc', borderRadius: 12, fontFamily: 'Arial, sans-serif' }}>
      <h2 style={{ marginBottom: 12 }}>Lucent: Clinical Trial Success Predictor</h2>
      <p style={{ fontSize: 14, marginBottom: 20 }}>
        Enter an NCTID to predict the trial's probability of success.<br />
        Example: <code>NCT00072579</code>
      </p>
      <input
        type="text"
        placeholder="Enter NCTID"
        value={nctid}
        onChange={(e) => setNctid(e.target.value)}
        style={{ padding: 8, width: '100%', marginBottom: 12, fontSize: 16 }}
      />
      <button
        onClick={fetchPrediction}
        style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer' }}
      >
        {loading ? 'Predicting...' : 'Predict'}
      </button>

      {error && <p style={{ color: 'red', marginTop: 20 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 30, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
          <h4>Prediction Result</h4>
          <p><strong>NCTID:</strong> {result.nctid}</p>
          <p><strong>Probability:</strong> {result.probability}</p>
          <p><strong>Uncertainty:</strong> {result.uncertainty}</p>
          <p><strong>Label:</strong> {result.label === 1 ? 'Likely Success' : 'Likely Failure'}</p>
        </div>
      )}
    </div>
  );
};

export default LucentApp;