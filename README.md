# Lucent

[![CI](https://github.com/adourian/lucent/actions/workflows/ci.yml/badge.svg)](https://github.com/adourian/lucent/actions/workflows/ci.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/adourian/lucent-backend?style=flat-square&color=0db7ed)](https://hub.docker.com/r/adourian/lucent-backend)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

**👉 Live demo:** https://lucent.kariadourian.com/

Lucent is an end-to-end machine learning system for predicting clinical trial outcomes from public trial data, combining multimodal neural networks with Monte Carlo Dropout for uncertainty estimation.

---

## 🧠 Model & Training

The prediction model served by Lucent was custom-trained by the author using a multi-modal neural network combining:

- Clinical text embeddings (MedBERT, BioSimCSE)
- Molecular representations (ChemBERTa on SMILES)
- Structured trial metadata (phase, drug count, etc.)

Each modality is processed through dedicated neural towers and fused via attention before final prediction.  
Uncertainty is estimated at inference time using **Monte Carlo Dropout**.

👉 Full model training, data processing, experiments, and results are documented here:  
**https://github.com/adourian/Clinical-Trial-Outcomes**

This repository contains the complete modeling pipeline, benchmarks, and architectural details.

---

## 🚀 Features

- ⚡ Pulls study JSON instantly from ClinicalTrials.gov  
- 🧠 Predicts success probability + MC Dropout uncertainty  
- 💻 Clean React + Vite UI (mobile-responsive)  
- 🔌 FastAPI backend with type hints and PyTest coverage  
- 🐳 Runs end-to-end with a single `docker compose up --build`

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
4. A custom-trained multi-modal neural network returns a success probability and MC Dropout uncertainty.

---


## 🏁 Local Development Setup

<details>
<summary><strong>Model Card (v0.2.0)</strong></summary>

| Metric | Value |
|--------|-------|
| Training set | 17 500 trials (NCTs) |
| Val. accuracy | **70 %** (macro) |
| Monte-Carlo σ | ~0.09 |

</details>


### **Option 1 — Docker**  
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

# Create .env file for local development
echo "VITE_API_BASE=http://localhost:8000" > .env

npm run dev                    # http://localhost:5173
```

**Important:** The frontend needs `VITE_API_BASE` environment variable to connect to the backend. The command above creates the `.env` file automatically, or you can create it manually:
```env
# frontend/.env
VITE_API_BASE=http://localhost:8000
```

Open two terminals (one for each command set) and you’ll have a hot-reloading dev stack running locally.

---

## 📄 License

MIT

---

## 📬 Contact

kari.adourian@gmail.com
