# Lucent

[![Main CI](https://github.com/adourian/lucent/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/adourian/lucent/actions/workflows/ci.yml)
[![Dev CI](https://github.com/adourian/lucent/actions/workflows/ci-dev.yml/badge.svg?branch=dev)](https://github.com/adourian/lucent/actions/workflows/ci-dev.yml)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-22-315C2B.svg)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

**👉 Live demo:** [lucent.kariadourian.com](https://lucent.kariadourian.com/)

Lucent is an end-to-end machine-learning system that estimates the probability
of a favorable clinical trial outcome at the study's current development stage
from public trial data. It combines a multimodal neural network with Monte Carlo
dropout for uncertainty estimation.

---

## Model and training

The deployed v0.3.0 model uses a multimodal neural network with six inputs:

- Lead-sponsor text encoded with all-MiniLM-L6-v2
- Conditions encoded with MedBERT
- Brief-summary, inclusion, and exclusion text encoded with BioSimCSE-BioLinkBERT
- A categorical trial-phase vector

The five text representations pass through modality-specific towers and attention
fusion. A learned phase representation joins the fused text representation before
the prediction head. At inference time, 500 stochastic dropout passes produce the
reported mean probability and MC-dropout dispersion.

Model training, data processing, experiments, and results are documented in the
[model-development repository](https://github.com/adourian/Clinical-Trial-Outcomes).

That repository contains the complete modeling pipeline, benchmarks, and
architectural details.

---

## Features

- Retrieves public study records from ClinicalTrials.gov
- Reports a favorable-outcome probability with MC-dropout dispersion
- Presents trial, model, and optional sponsor-market context
- Uses a React and Vite frontend with a typed FastAPI backend
- Runs end to end with `docker compose up --build`

---

## Project architecture

```bash
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
4. A custom-trained multimodal neural network returns an estimated probability
   of a favorable trial outcome and MC-dropout dispersion.

---

## Local development

<details>
<summary><strong>Deployed model (v0.3.0)</strong></summary>

| Metric | Value |
| -------- | ------- |
| Training corpus | 33K trials |
| Inference | 500 MC-dropout passes |
| Output | Mean probability and MC-dropout dispersion |

</details>

### Option 1 — Docker

```bash
git clone https://github.com/adourian/lucent.git
cd lucent
docker compose up --build
```

- API docs → <http://localhost:8000/docs>
- Front-end UI → <http://localhost:3000>

---

### Option 2 — Run services manually

#### Back end (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # http://localhost:8000/docs
```

#### Front end (React + Vite)

```bash
cd frontend
npm ci
npm run dev                    # http://localhost:5173
```

The Vite development server proxies prediction and finance requests to the local
back-end on `http://127.0.0.1:8000`. To use a different API host, create an
optional environment file and restart Vite:

```env
# frontend/.env
VITE_API_BASE=http://localhost:8000
```

Open two terminals (one for each command set) and you’ll have a hot-reloading dev
stack running locally.

---

## Continuous integration and deployment

The `dev` and `main` workflows run backend tests and frontend linting, type
checking, and a production build. Railway is responsible for building the service
images from the repository Dockerfiles and deploying the connected branch after
its required CI checks pass; GitHub Actions does not publish duplicate Docker
images.

---

## License

MIT

---

## Contact

kari.adourian@gmail.com
