# Lucent

**Clarity in Clinical Trials. Confidence in Every Decision.**

Lucent is an AI-powered platform that gives investors, biotech executives, and analysts instant, data-driven predictions on the probability of success for clinical trials. Enter a ClinicalTrials.gov NCTID and get a predictive insight—so you can make smarter, faster decisions in a complex industry.

---

## 🚀 Features (MVP v1)

- 🔎 **NCTID Lookup:** Instantly fetch and validate clinical trial data from ClinicalTrials.gov
- 🧠 **ML Prediction:** Return an AI-driven probability of trial success
- 📦 **Containerized Backend:** FastAPI API, fully Dockerized for reproducible deployment
- ✅ **Automated Tests:** Pytest for endpoints and core logic
- 🗂️ **Clean, Modular Structure:** Scalable and professional codebase

---

## 🏗️ Project Architecture

```
lucent/
│
├── app/
│   ├── main.py          # FastAPI entrypoint
│   ├── api/             # API routes
│   ├── services/        # Business logic (data fetching, prediction)
│   ├── models/          # ML model loading/inference
│   └── core/            # Config/utilities
│
├── tests/               # Unit/integration tests
├── Dockerfile           # Container setup
├── requirements.txt     # Python deps
├── .gitignore
├── README.md
└── scripts/             # For setup, data/model management
```

**Flow:**
1. User submits an NCTID via the `/predict` endpoint.
2. Backend fetches trial data from ClinicalTrials.gov.
3. Data is preprocessed, then run through the trained ML model.
4. API returns predicted success probability (+ confidence, if available).

---

## 🏁 Quickstart

```bash
# Clone and enter repo
git clone https://github.com/adourian/lucent.git
cd lucent

# Build Docker image
docker build -t lucent-app .

# Run container
docker run -p 8000:8000 lucent-app

# The API will be available at http://localhost:8000/docs
```

---

## 🧪 Testing

```bash
pytest tests/
```

---

## 🚦 Roadmap

- [x] Backend MVP: FastAPI + Docker + CI-ready
- [ ] ML model integration and artifact management
- [ ] Frontend (React) UI for end-users
- [ ] Model interpretability and confidence metrics
- [ ] Bulk/portfolio analysis mode
- [ ] User authentication and saved analyses

---

## 📄 License

MIT

---

## 📬 Contact

kari.adourian@gmail.com
