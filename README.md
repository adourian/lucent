# Lucent

**Clinical Trials Intelligence**

Lucent is an AI-powered platform that gives investors, biotech executives, and analysts instant, data-driven predictions on the probability of success for clinical trials. Enter a ClinicalTrials.gov NCTID and get a predictive insight—so you can make smarter, faster decisions in a complex industry.

---

## 🚀 Features (MVP v1)

- **Instant NCTID lookup** – pulls latest study JSON from ClinicalTrials.gov  
- **Multi-modal ML prediction** – success probability *plus* Monte-Carlo uncertainty  
- **React + Vite UI** – clean, mobile-responsive interface  
- **FastAPI micro-service** – typed and fully tested  
- **One-command Docker** – `docker compose up --build` boots both services

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
