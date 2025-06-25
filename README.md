# Lucent

[![CI](https://github.com/adourian/lucent/actions/workflows/ci.yml/badge.svg)](https://github.com/adourian/lucent/actions/workflows/ci.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/adourian/lucent-backend?style=flat-square&color=0db7ed)](https://hub.docker.com/r/adourian/lucent-backend)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

**👉 Live demo:** https://lucent-self.vercel.app

**Clinical Trials Intelligence**

Lucent is an AI-powered platform that gives investors, biotech executives, and analysts instant, data-driven predictions on the probability of success for clinical trials. Enter a ClinicalTrials.gov NCTID and get a predictive insight—so you can make smarter, faster decisions in a complex industry.

---

## 🚀 Features

- ⚡ **Pulls** study JSON instantly from ClinicalTrials.gov  
- 🧠 **Predicts** success probability **+** MC-dropout uncertainty  
- 💻 **Displays** in a clean React + Vite UI (mobile-responsive)  
- 🔌 **Serves** via FastAPI with type hints & PyTest coverage  
- 🐳 **Runs** end-to-end with a single `docker compose up --build`

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
|   ├── Dockerfile
│   └── ...
│
├── frontend/
│   ├── src/                        # React + Vite frontend
│   ├── public/                     # Static assets
|   ├── Dockerfile
│   └── ...
│
├── README.md
└── docker-compose.yml
```

**Flow:**
1. User enters an NCTID via the frontend or `/predict` endpoint.
2. Backend fetches trial data from ClinicalTrials.gov.
3. Data is parsed, preprocessed, and embedded.
4. A trained multi-modal neural network returns a success probability and uncertainty.

---


## 🏁 Local Development Setup

<details>
<summary><strong>Model card (v0.2.0)</strong></summary>

| Metric | Value |
|--------|-------|
| Training set | 17 500 trials (NCTs) |
| Val. accuracy | **70 %** (macro) |
| Monte-Carlo σ | ~0.09 |

</details>


### **Option 1 — Docker (one-command stack)**  
```bash
git clone https://github.com/adourian/lucent.git
cd lucent
docker compose up --build
```
* API docs → <http://localhost:8000/docs>  
* Front-end UI → <http://localhost:3000>

---

### **Option 2 — Run services manually**

#### Back-end (FastAPI)  
```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000/docs
```

#### Front-end (React + Vite)  
```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

Open two terminals (one for each command set) and you’ll have a hot-reloading dev stack running locally.

---

## 📄 License

MIT

---

## 📬 Contact

kari.adourian@gmail.com
