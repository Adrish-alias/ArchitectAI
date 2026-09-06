<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen.svg" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-purple.svg" alt="PRs">
  <img src="https://img.shields.io/badge/Made_with-React_Flow-FF007F.svg" alt="React Flow">
  
  <h1>🌟 ArchitectAI 🌟</h1>
  <h3>RAG-Grounded Multi-LLM Cloud Infrastructure Agent</h3>
  <p>Transforming natural language requirements into grounded, deployment-oriented AWS architectures.</p>
</div>

---

> **Note:** This is an active personal maintenance repository. The original hackathon repository is linked here: [Original Repository](https://github.com/Adrish-alias/Architect_Ai)

## 🚀 Overview

**ArchitectAI** is a generative AI assistant designed to act as an automated Solutions Architect. It bridges the gap between high-level business requirements and technical cloud implementations by transforming natural-language descriptions into comprehensive, multi-tier AWS architectures grounded in curated AWS Reference Architectures.

### 💡 Why ArchitectAI?

Designing cloud infrastructure traditionally requires significant domain expertise and manual architecture design. ArchitectAI provides:

- **Instant Productivity:** Move from idea to architecture recommendations in seconds.
- **RAG Reference & Topology Grounding:** Ground service selection and structural connections in curated AWS Reference Architectures using semantic vector search and dynamic confidence-based topology preservation.
- **Traceable Architectural Decisions:** Distinguish between `RETRIEVED_GROUNDED` decisions backed by retrieved references and `LLM_DERIVED` decisions generated from model reasoning.
- **End-to-End Graph Skeleton Preservation:** Pass retrieved reference topology through multi-step LLM prompts to produce structured `topology_edges` and accurate visual graph representations.
- **Automated Consistency Validation:** Validate service selections, data flows, and architecture diagrams, with an LLM correction loop for semantic inconsistencies.
- **Interactive Architecture Visualization:** Explore, edit, and inspect generated infrastructure through an interactive React Flow interface.
- **Architecture Analysis:** Analyze generated architectures for potential cost issues, over-provisioning, and architectural anti-patterns.

---

## 🏗️ Architecture Flow

```text
Natural Language Requirements
            ↓
Requirement Classification
            ↓
Structured Requirement Profile
            ↓
Local RAG Retrieval + Reranking
            ↓
Reference Analysis, Topology Extraction & Grounding
            ↓
LLM Service Selection & Topology Definition
            ↓
Architecture JSON (with topology_edges) + Mermaid Diagram
            ↓
Consistency Validation
            ↓
LLM Correction Loop
            ↓
Final Architecture + Cost + Implementation Plan
```

---

## ✨ Key Features & Visuals

### 1. Requirement Classification & Infrastructure Tiering

<p align="center">
  <img src="assets/generator-input.png" alt="Project Input and Tiered Generation" width="900"/>
</p>

Input your project idea, expected user scale, budget, and key features. ArchitectAI classifies the requirements and generates three infrastructure tiers:

**Cost-Optimized · Balanced · High-Performance**

---

### 2. Deep Architecture Analysis & Error Detection

<p align="center">
  <img src="assets/analyser-diagram.png" alt="Architecture Analyser Highlighting Issues" width="900"/>
</p>

<p align="center">
  <img src="assets/analyser-issues.png" alt="Architecture Issue Details" width="900"/>
</p>

The Architecture Analyser audits existing architectures and provides actionable recommendations, including potential cost issues, missing service relationships, and architectural anti-patterns.

---

### 3. Interactive React Flow Diagrams

<p align="center">
  <img src="assets/architecture-diagram.png" alt="Interactive React Flow Diagram" width="900"/>
</p>

Explore generated cloud infrastructure through interactive, zoomable, and editable node-based graphs. Inspect relationships between AWS services such as Amazon Cognito, API Gateway, AWS Lambda, ECS Fargate, and DynamoDB.

---

### 4. Cost Estimation & Implementation Planning

<p align="center">
  <img src="assets/cost-analysis.png" alt="Cost Analysis and Implementation Plan" width="900"/>
</p>

View estimated monthly and annual costs based on workload characteristics, with service-level cost breakdowns and a phase-by-phase implementation roadmap.

---

## 🧠 The Multi-LLM & RAG Pipeline

ArchitectAI uses a multi-stage **local RAG and multi-LLM orchestration** pipeline:

1. **Requirement Classification — Meta Llama 3-70B:** Extracts architectural characteristics including scale, compute intensity, data complexity, and real-time requirements.

2. **Local Vector RAG Retrieval — `all-MiniLM-L6-v2`:** Searches a local vector index of curated AWS Reference Architectures using semantic similarity and requirement-coverage scoring.

3. **Reference Analysis, Topology Extraction & Decision Grounding:** Analyzes retrieved architectures, extracts reference topology connections, and determines grounding strength (using a `0.82` threshold for strict vs. loose topology enforcement).

4. **Guardrail Service Selection & Topology Definition — Meta Llama 3-70B:** Uses structured requirements and retrieved architectural evidence to select AWS services and generate an explicit `## Architecture Topology` sequence.

5. **JSON Assembly & Mermaid Generation:** Converts service selections and topology into structured architecture JSON with explicit `topology_edges`, rendering topology-grounded Mermaid graph skeletons.

6. **Consistency Validation & LLM Correction:** Validates service selections, roles, data flows, and Mermaid representations. Semantic inconsistencies can be sent back to the LLM for correction, with up to two correction attempts.

7. **Senior Architectural Pass — Google Gemini 2.5 Flash:** Performs a final refinement pass over the generated architecture, including security boundaries, data flows, and cost considerations.

---

## 🛠️ Technology Stack

| Domain                     | Technologies                                                                      |
| :------------------------- | :-------------------------------------------------------------------------------- |
| **Frontend**               | React 19, Vite, React Flow, React Router DOM, Vanilla CSS                         |
| **Backend**                | Node.js, Express.js (Modular Architecture)                                        |
| **Local RAG & Embeddings** | `@xenova/transformers`, `all-MiniLM-L6-v2`, ONNX Runtime WASM, Local Vector Store |
| **AI / LLMs**              | Amazon Bedrock (Meta Llama 3-70B), Google Gemini 2.5 Flash                        |

---

## 📂 Repository Structure

```text
ArchitectAI/
├── backend/                              # Express.js Server & LLM Orchestration
│   ├── .env.example                      # Environment variables template
│   ├── package.json                      # Server dependencies & scripts
│   ├── data/                             # Knowledge base records & persistent RAG index
│   ├── scripts/                          # RAG indexing, testing & evaluation utilities
│   └── src/                              # Modular backend codebase
│       ├── server.js                     # HTTP server entry point
│       ├── app.js                        # Express app configuration & middleware
│       ├── routes/                       # Architecture & Analysis API endpoints
│       ├── controllers/                  # HTTP request handling
│       ├── services/                     # Generation, Analysis, Validator, LLM & Mermaid services
│       ├── rag/                          # Local RAG engine
│       ├── config/                       # Environment configuration & RAG thresholds
│       └── prompts/                      # Multi-LLM prompt templates
│
├── frontend/                             # React Client-side Application
│   └── react-app/
│       ├── src/                          # React components & React Flow hooks
│       ├── public/                       # Static assets
│       ├── index.html                    # Vite entry point
│       └── vite.config.js                # Vite configuration
│
├── assets/                               # Application screenshots
└── README.md                             # Project documentation
```

---

## ⚙️ Quick Start Installation

Follow these instructions to run ArchitectAI locally.

### 1. Prerequisites

Ensure you have Node.js installed.

Create a `.env` file in the `backend` directory using `.env.example` as a template:

```env
GEMINI_API_KEY=your_gemini_key_here
AWS_BEARER_TOKEN_BEDROCK=your_bedrock_token_here
RAG_ENABLED=true
RAG_RELEVANCE_THRESHOLD=0.45
```

**Never commit your `.env` file or expose API credentials.**

### 2. Clone the Repository

```bash
git clone https://github.com/Adrish-alias/Architect-AI.git
cd Architect-AI
```

### 3. Build the Vector Index & Start the Backend

```bash
cd backend
npm install

# Build/verify the local RAG vector index
npm run rag:index

# Start backend server
npm start
```

### 4. Start the Frontend

Open a new terminal:

```bash
cd frontend/react-app
npm install
npm run dev
```

The application will launch on a local development URL, usually:

```text
http://localhost:5173
```

---

## 🔮 Future Roadmap

- [ ] **Infrastructure as Code Export:** Generate deployable Terraform / AWS CDK configurations directly from validated architecture graphs.
- [ ] **Expanded AWS Knowledge Base:** Continuously add and curate more AWS Reference Architectures and architectural patterns to improve RAG coverage across different application domains.
- [ ] **Advanced Architecture Evaluation:** Expand the validator to evaluate architectures against AWS Well-Architected principles, security best practices, reliability, and cost efficiency.
- [ ] **Improved RAG Evaluation & Grounding:** Introduce quantitative retrieval and generation benchmarks to measure retrieval quality, grounding accuracy, and improvement over standalone LLM generation.
- [ ] **Architecture Versioning & Comparison:** Save generated architectures and compare different designs across cost, scalability, reliability, and service choices.
- [ ] **Multi-Cloud Architecture Support:** Extend the architecture generation and knowledge base beyond AWS to support equivalent GCP and Azure architectures.

---

## 🤝 Core Contributors

Crafted with passion by the ArchitectAI Team:

* [**Adrish Chatterjee**](https://github.com/Adrish-alias)
* [**Ansh Singh**](https://github.com/AnshSingh-2024)
* [**Nakshtra Agrawal**](https://github.com/nakshtraagrawal)
* [**Pratyush Parashar**](https://github.com/pratyuxxhh)

---

<div align="center">
  <p>Built under the <b>MIT License</b>.</p>
</div>
