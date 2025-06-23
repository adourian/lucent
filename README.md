# Lucent

**Clinical Trials Intelligence**

Lucent is an AI-powered platform that gives investors, biotech executives, and analysts instant, data-driven predictions on the probability of success for clinical trials. Enter a ClinicalTrials.gov NCTID and get a predictive insight—so you can make smarter, faster decisions in a complex industry.

---

<p align="center">
  <img src="https://raw.githubusercontent.com/<user>/lucent/main/frontend/public/logo.svg" width="120" />
</p>

<h3 align="center">Lucent – Clinical Trials Intelligence</h3>
<p align="center">
  AI-powered probability forecasts for every <code>NCTID</code><br/>
  <a href="https://lucent.app">Live demo</a> • <a href="#quickstart">Quick-start</a> • <a href="#architecture">Architecture</a>
</p>

## 🚀 Features (MVP v1)

- 🔎 **NCTID Lookup:** Instantly fetch and validate clinical trial data from ClinicalTrials.gov
- 🧠 **ML Prediction:** Return an AI-driven probability of trial success, including uncertainty via Monte Carlo Dropout
- 🌐 **Frontend UI:** React + Vite interface for users to query trials
- ⚙️ **FastAPI Backend:** Modular, testable API layer with clear separation of concerns
- ✅ **Automated Tests:** Full unit and integration test coverage with `pytest`
- 📦 **Containerized:** Docker-ready backend for deployment or local testing

---

## 🏗️ Project Architecture

```
lucent/
|
├── backend/
│   ├── app/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── core/                   # Parsing, preprocessing, prediction logic
│   │   ├── models/                 # ML model definition and loading
│   │   └── services/               # ClinicalTrials.gov API fetch
│   ├── tests/                      # Unit & integration tests
│   ├── requirements.txt            # Python dependencies
│
├── frontend/
│   ├── src/                        # React + Vite frontend
│   ├── public/                     # Static assets
│   └── ...
│
├── README.md
└── Dockerfile
```

**Flow:**
1. User enters an NCTID via the frontend or `/predict` endpoint.
2. Backend fetches trial data from ClinicalTrials.gov.
3. Data is parsed, preprocessed, and embedded.
4. A trained multi-modal neural network returns a success probability and uncertainty.

---

## 🧪 Local Development Setup

### 1. Set up Python backend

\`\`\`bash
cd backend
python -m venv .venv
source .venv/bin/activate        # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
\`\`\`

### 2. Set up Node.js frontend

\`\`\`bash
cd ../frontend
npm install
\`\`\`

### 3. Run the application (in two terminals)

**Terminal 1: Backend**
\`\`\`bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
\`\`\`

**Terminal 2: Frontend**
\`\`\`bash
cd frontend
npm run dev
\`\`\`

- Backend API: http://localhost:8000/docs  
- Frontend UI: http://localhost:5173

---

## 🧪 Testing

\`\`\`bash
cd backend
pytest tests/
\`\`\`

---

## 🚦 Roadmap

- [x] Backend MVP with prediction model
- [x] ML pipeline with Monte Carlo Dropout
- [x] Frontend React UI
- [x] Unit & integration test coverage
- [ ] Dockerization for backend + frontend
- [ ] Live deployment (Render / Vercel / Railway)
- [ ] Interpretability tools and user analytics

---

## 📄 License

MIT

---

## 📬 Contact

kari.adourian@gmail.com
