<div align="center">
  <img src="https://img.shields.io/badge/Status-Active_Development-brightgreen.svg" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-purple.svg" alt="PRs">
  <img src="https://img.shields.io/badge/Made_with-React_Flow-FF007F.svg" alt="React Flow">
  
  <h1>🌟 ArchitectAI 🌟</h1>
  <h3>RAG-Grounded Multi-LLM Cloud Architecture Assistant</h3>
  <p>Generates grounded, multi-tier AWS architecture proposals from natural language requirements.</p>
</div>

---

> **Note:** This repository is under active personal development. The original hackathon repository is archived here: [Original Repository](https://github.com/Adrish-alias/Architect_Ai).

## 🚀 Overview

**ArchitectAI** is an experimental AI-assisted Solutions Architect tool that translates natural language system requirements into structured AWS architecture proposals. It grounds design choices and service connectivity in curated AWS Reference Architectures using local vector retrieval, validates structural consistency, and renders interactive architecture diagrams.

> **Disclaimer:** ArchitectAI produces AI-generated design recommendations and estimates for exploratory and planning purposes. Output should be reviewed by qualified cloud architects before production implementation.

---

## 🏗️ Architecture Generation Pipeline

The backend orchestrates a multi-step pipeline combining local retrieval-augmented generation (RAG) and large language model passes:

```text
Natural Language Requirements
            ↓
Step 1: Requirement Classification (LLM)
            ↓
Requirement Profile (Application type, scale, compute/data/realtime needs)
            ↓
Step 2: Local Vector RAG Retrieval + Reranking (all-MiniLM-L6-v2)
            ↓
Reference Analysis, Topology Extraction & Decision Grounding
            ↓
Step 3: Service Selection & Topology Definition (LLM)
            ↓
Step 4: Architecture JSON Assembly & Mermaid Diagram Generation
            ↓
Step 5: Structural Consistency Validation & LLM Correction Loop
            ↓
Step 6: Senior Refinement Pass (Google Gemini)
            ↓
Final Architecture Output (JSON + Topology Edges + Interactive Graph + Cost Estimate)
```

---

## 🧠 LLM Provider Abstraction

ArchitectAI features a provider-switchable LLM abstraction layer (`backend/src/services/llm/`), allowing the primary LLM provider and model to be configured through environment variables without altering the core pipeline logic or prompts.

### Supported Providers & Models

| Provider | Supported Models | Configuration | Status |
| :--- | :--- | :--- | :--- |
| **Amazon Bedrock** *(Default)* | **Meta Llama 3.3 70B Instruct** (`arn:aws:bedrock:us-east-1:...`) | `LLM_PROVIDER=bedrock`<br>`BEDROCK_MODEL_ID=<llama-arn>` | **Implemented & Verified** across the full 5-step pipeline |
| **Amazon Bedrock** | **OpenAI GPT-OSS 120B** (`openai.gpt-oss-120b-1:0`) | `LLM_PROVIDER=bedrock`<br>`BEDROCK_MODEL_ID=openai.gpt-oss-120b-1:0` | **Implemented & Verified** (Provider connectivity and completion tested; full pipeline benchmarking experimental) |
| **Groq** | **OpenAI GPT-OSS 120B** (`openai/gpt-oss-120b`) | `LLM_PROVIDER=groq`<br>`GROQ_MODEL=openai/gpt-oss-120b`<br>`GROQ_API_KEY=<key>` | **Implemented & Verified** (Provider connectivity and contract simulation verified; high verbosity can require token limit tuning on large prompts) |
| **Google Gemini** | **Gemini 2.5 Flash** | `GEMINI_API_KEY=<key>` | **Implemented** as the Step 6 refinement pass (gracefully falls back if rate-limited) |

### Key Abstraction Characteristics:
- **Single Variable Switching**: Switch providers entirely via `LLM_PROVIDER` in `backend/.env`.
- **Bedrock Model Selection**: Switch between Llama 3.3 70B and GPT-OSS 120B via `BEDROCK_MODEL_ID` in `backend/.env`.
- **Payload Normalization**: Automatically formats requests for Meta Llama (Llama 3 prompt envelope) or OpenAI/GPT-OSS chat completion format (`messages` array), stripping internal `<reasoning>` tags where applicable.
- **Fail-Fast Startup Validation**: Validates provider configuration at application launch and reports missing credentials without silent fallback.
- **Credential Safety**: All logging strictly redacts secrets, tokens, and authorization headers.

---

## ✨ Core Functionality & Features

### 1. Local Vector RAG Engine
- **Local Embeddings**: Generates 384-dimensional dense vectors locally using `@xenova/transformers` with the `all-MiniLM-L6-v2` ONNX model (no external embedding API calls required).
- **Hybrid Scoring**: Combines cosine semantic similarity with requirement-coverage matching.
- **Topology Extraction**: Extracts verified service-to-service connection paths from retrieved reference architectures and provides them to the generation prompt to anchor topology structure.
- **Grounding Attribution**: Distinguishes decisions backed by reference architectures from model-derived inferences.

### 2. Architecture Consistency Validation & Correction Loop
- **Rule-based Validator**: Analyzes generated service components for semantic relationships (e.g., ensuring client traffic traverses API Gateway/ALB, cache placement, database connectivity).
- **Automated Correction Retry**: If semantic inconsistencies are detected, a targeted correction prompt requests revisions from the LLM (up to 2 retry attempts).

### 3. Interactive Visualization (React Flow)
- Renders generated Mermaid topology as an interactive, node-based graph using React Flow.
- Supports zooming, panning, node inspection, and visual hierarchy exploration.

### 4. Cost Estimation & Implementation Roadmap
- Generates preliminary monthly cost ranges and per-service estimations based on scale parameters.
- Outlines phased implementation steps from foundational networking to monitoring and deployment.

---

## 🔍 Verification & Testing Scripts

The repository includes standalone scripts to test and evaluate components independently:

| Script | Purpose | Command |
| :--- | :--- | :--- |
| `scripts/test-llm-provider.js` | Verifies credentials, connectivity, latency, and token metrics for the active provider configured in `.env`. | `node scripts/test-llm-provider.js` |
| `scripts/compare-llm-providers.js` | Sends an identical test prompt to both Bedrock and Groq to compare outputs side-by-side. | `node scripts/compare-llm-providers.js` |
| `scripts/test-pipeline-full.js` | Executes the complete 5-step architecture generation pipeline end-to-end and validates output contract integrity. | `node scripts/test-pipeline-full.js` |
| `scripts/rag-index.js` | Builds or updates the local RAG vector index from curated reference architectures. | `npm run rag:index` |
| `scripts/rag-test.js` | Tests retrieval accuracy and ranking against sample workloads. | `npm run rag:test` |

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Flow, React Router DOM, Vanilla CSS |
| **Backend** | Node.js (v20+ / v24), Express.js (Modular Service Architecture) |
| **Local RAG & Embeddings** | `@xenova/transformers`, `all-MiniLM-L6-v2`, ONNX Runtime WASM, Local Vector Store |
| **AI / LLMs** | AWS Bedrock SDK (Llama 3.3 70B, GPT-OSS 120B), Groq SDK (GPT-OSS 120B), Google Generative AI (Gemini 2.5 Flash) |

---

## 📂 Repository Structure

```text
ArchitectAI/
├── backend/                              # Express.js Server & LLM Orchestration
│   ├── .env.example                      # Environment variable template
│   ├── package.json                      # Backend dependencies & npm scripts
│   ├── data/                             # Knowledge base records & persistent RAG index
│   ├── scripts/                          # Provider testing, pipeline evaluation & RAG scripts
│   └── src/                              # Modular backend codebase
│       ├── server.js                     # HTTP server entry point & startup validation
│       ├── app.js                        # Express app setup & middleware
│       ├── routes/                       # /generate and /analyse route definitions
│       ├── controllers/                  # Request handling & error formatting
│       ├── services/                     # Pipeline orchestrator, validator, and Mermaid services
│       │   └── llm/                      # Unified LLM provider abstraction
│       │       ├── llm.service.js        # Provider factory & common interface
│       │       └── providers/            # Bedrock and Groq provider adapters
│       ├── rag/                          # Local vector index, embedder & retrieval engine
│       ├── config/                       # Environment variable parser
│       └── prompts/                      # Multi-stage prompt templates
│
├── frontend/                             # React Client-side Application
│   └── react-app/
│       ├── src/                          # React components, pages & graph parsers
│       ├── public/                       # Static assets
│       └── vite.config.js                # Vite build configuration
│
├── assets/                               # Application screenshots & diagrams
└── README.md                             # Project documentation
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Node.js**: v20.x or higher (tested on Node.js v24)
- **API Credentials**:
  - AWS Bedrock access with credentials / bearer token for Bedrock models.
  - *(Optional)* Groq API key for Groq models.
  - *(Optional)* Google Gemini API key for Step 6 refinement.

### 2. Configure Environment Variables
Copy `.env.example` in the `backend` directory to `.env`:

```bash
cd backend
cp .env.example .env
```

Configure the provider and credentials in `backend/.env`:

```env
# Provider selection: bedrock | groq
LLM_PROVIDER=bedrock

# Bedrock configuration (when LLM_PROVIDER=bedrock)
# Default Llama 3.3 70B:
BEDROCK_MODEL_ID=arn:aws:bedrock:us-east-1:434702088658:inference-profile/us.meta.llama3-3-70b-instruct-v1:0
# Or GPT-OSS 120B:
# BEDROCK_MODEL_ID=openai.gpt-oss-120b-1:0
AWS_BEARER_TOKEN_BEDROCK=your_aws_bearer_token_here

# Groq configuration (when LLM_PROVIDER=groq)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-120b

# Step 6 refinement (optional)
GEMINI_API_KEY=your_gemini_api_key_here

PORT=5000
RAG_ENABLED=true
RAG_DEBUG=false
```

> **Security Note:** Never commit your `backend/.env` file. It is explicitly ignored by Git in `.gitignore`.

### 3. Verify Active Provider
Test your provider configuration before starting the server:

```bash
node scripts/test-llm-provider.js
```

### 4. Build Local RAG Index & Start the Backend
```bash
# Build/verify the local embedding vector index
npm run rag:index

# Start backend server
npm start
```

### 5. Start the Frontend
In a separate terminal:

```bash
cd frontend/react-app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## ⚠️ Known Limitations & Considerations

1. **AI Design Disclaimers**: Architectures are generated by LLMs grounded in reference templates; edge cases, compliance-specific certifications (e.g., HIPAA, PCI-DSS), and exact service quotas require human review.
2. **Model Verbosity Differences**: GPT-OSS 120B produces substantially more verbose JSON output than Llama 3.3 70B. On complex multi-tenant prompts, this can approach or exceed token limits during Step 3 JSON assembly.
3. **External Rate Limits**: When Step 6 Gemini refinement reaches free-tier rate limits (HTTP 429), the pipeline automatically logs a fallback notice and outputs the verified Step 4 architecture.
4. **Local Embedding Memory**: First-time execution of `npm run rag:index` downloads the `all-MiniLM-L6-v2` ONNX model weights (~90MB) to local cache.

---

## 🤝 Core Contributors

* [**Adrish Chatterjee**](https://github.com/Adrish-alias)
* [**Ansh Singh**](https://github.com/AnshSingh-2024)
* [**Nakshtra Agrawal**](https://github.com/nakshtraagrawal)
* [**Pratyush Parashar**](https://github.com/pratyuxxhh)

---

<div align="center">
  <p>Licensed under the <b>MIT License</b>.</p>
</div>
