# Lucent

[![Build](https://github.com/adourian/lucent/actions/workflows/ci.yml/badge.svg)](https://github.com/adourian/lucent/actions)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

**👉 Live demo:** https://lucent-self.vercel.app

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
