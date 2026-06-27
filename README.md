# Atlas — Information Retrieval System

> [!CAUTION]
> ## 🔴 ORIGINAL REPOSITORY
> **This is a mirror. The original and up-to-date repository is hosted on GitLab:**
>
> ### ➜ [gitlab.com/LoRdex/information_retrival_project](https://gitlab.com/LoRdex/information_retrival_project)
>
> All development, commits, and issues are tracked there. This GitHub copy may be outdated.

---

> A full-stack Information Retrieval engine built with Service-Oriented Architecture (SOA), supporting TF-IDF, BM25, BERT, and Hybrid search over 500K+ documents.

---

## Overview

**Atlas** is a search engine built for the IR Project 2026. It indexes and retrieves documents from two large-scale datasets using multiple representation models, served through independent microservices and a modern Arabic/English web UI.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flask UI Gateway                      │
│                   http://127.0.0.1:5001                 │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
  ┌─────────────┐ ┌──────────────┐ ┌─────────────┐
  │ Data Loader │ │Representation│ │   Search    │
  │   :8001     │ │    :8002     │ │    :8003    │
  └──────┬──────┘ └──────┬───────┘ └──────┬──────┘
         │               │                │
         └───────────────┴────────────────┘
                         │
                    ┌────▼────┐
                    │  MySQL  │
                    │ir_db_v2 │
                    └─────────┘
```

| Service | Port | Responsibility |
|---|---|---|
| `data_loader_api.py` | 8001 | Downloads & stores datasets in MySQL |
| `representation_api.py` | 8002 | Builds TF-IDF, BM25, BERT, FAISS, Inverted Index |
| `search_api.py` | 8003 | Search, ranking, NER reranking, cluster reranking |
| `ui/app.py` | 5001 | Flask gateway — frontend & API proxy |

---

## Datasets

| Dataset | Documents | Queries | Qrels |
|---|---|---|---|
| `beir/quora/test` | 522,931 | 10,000 | 15,675 |
| `wikir/en1k/test` | 369,721 | 100 | 4,435 |

---

## Representation Models

| Model | Method | Matching |
|---|---|---|
| **TF-IDF** | VSM with IDF weighting | Cosine Similarity |
| **BM25** | Probabilistic BM25Okapi | BM25 Score |
| **BERT** | `all-MiniLM-L6-v2` + FAISS | L2 Distance → Cosine |
| **Hybrid Parallel** | BM25 + BERT score fusion | Weighted Sum (k1=1.6, b=0.75) |
| **Hybrid Serial** | BM25 retrieve → BERT re-rank | Cosine on candidates |

---

## Evaluation Results — `beir/quora/test`

Evaluated on a random sample of **500 queries** (seed=42, k=10).

| Model | MAP | P@10 | Recall@10 | nDCG@10 |
|---|---|---|---|---|
| TF-IDF | 0.6340 | 0.1030 | 0.7870 | 0.6840 |
| BM25 | 0.6760 | 0.1100 | 0.8350 | 0.7280 |
| **BERT** | **0.8300** | **0.1300** | **0.9370** | **0.8670** |
| Hybrid Parallel | 0.7480 | 0.1280 | 0.9270 | 0.8030 |
| Hybrid Serial | 0.8200 | 0.1260 | 0.9220 | 0.8570 |

### Key Findings
- **BERT achieves the highest MAP (0.830)** — semantic understanding dominates on Quora's question-matching task
- **Hybrid Serial is a strong second (MAP=0.820)** — BM25 candidate retrieval + BERT re-ranking gives near-BERT quality
- **BM25 outperforms TF-IDF** on all metrics by accounting for document length normalization
- **Recall@10 is excellent across all models (>78%)** — the system successfully surfaces relevant documents

> Full evaluation with before/after additional features comparison: [`notebooks/evaluation_requirement8_quora.ipynb`](notebooks/evaluation_requirement8_quora.ipynb)

---

## Features

### Core IR Features
- Multi-model search: TF-IDF, BM25, BERT, Hybrid Parallel, Hybrid Serial
- Inverted Index for fast candidate pre-filtering
- Document clustering (KMeans, 20 clusters) + LDA topic modeling
- Full text preprocessing: tokenization, lemmatization, POS-tagging, stopword removal

### Additional Features
- **NER Reranking** — boosts documents matching named entities (people, places) extracted from query
- **Cluster Reranking** — prioritizes documents from the topically closest cluster
- **Query autocomplete** — real-time suggestions from the inverted index as you type
- **Spelling correction** — suggests corrections for misspelled query terms
- **Query log suggestions** — past successful searches shown as alternatives
- **BM25 live parameter control** — k1 and b adjustable from UI at query time

---

## Tech Stack

```
Backend:    FastAPI (3 microservices) + Flask (gateway)
Database:   MySQL via XAMPP
Indexing:   FAISS (IndexFlatL2), Inverted Index (JSON)
Models:     scikit-learn TF-IDF, rank_bm25, sentence-transformers (all-MiniLM-L6-v2)
NLP:        NLTK (tokenize/lemmatize/POS), spaCy (NER), pyspellchecker
Frontend:   Vanilla HTML + CSS + JS (no framework)
Fonts:      Fraunces · IBM Plex Sans Arabic · JetBrains Mono
```

---

## Quick Start

### 1. Prerequisites
- Python 3.11+
- XAMPP (MySQL on port 3306)
- ~3 GB disk for built models

### 2. Install
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Start MySQL
Open XAMPP Control Panel → Start **MySQL**

### 4. Launch everything
```powershell
.\start_all.bat
```
Opens 4 terminal windows (one per service) and launches the browser at `http://127.0.0.1:5001` automatically.

---

## Project Structure

```
information-retrieval-system/
├── api/
│   ├── data_loader_api.py          # Service 1 — dataset loading    (port 8001)
│   ├── representation_api.py       # Service 2 — model building     (port 8002)
│   └── search_api.py               # Service 3 — search & ranking   (port 8003)
├── core/
│   └── text_preprocessor.py        # Shared NLP pipeline (lemmatize, NER, spell)
├── ui/
│   ├── app.py                      # Flask gateway                  (port 5001)
│   ├── templates/index.html        # Atlas UI
│   └── static/                     # styles.css + script.js
├── notebooks/
│   ├── evaluation_requirement8_quora.ipynb   # Full evaluation (MAP/Recall/P@10/nDCG)
│   ├── clustering_impact_comparison.ipynb
│   └── ...
├── helper-docs/report-files/       # Arabic project report drafts
├── config.py.example               # Database config template
├── start_all.bat                   # One-click launcher (Windows)
├── run_all.ps1                     # PowerShell launcher
└── requirements.txt
```

---

## University Project

**Course:** Information Retrieval Systems 2026  
**Instructor:** د. أبي صندوق  
**Lab Instructors:** م. مروة الداية · م. سليمى المحايري  
**Deadline:** 7/3/2026
