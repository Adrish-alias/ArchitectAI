<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-brightgreen.svg" alt="Status">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-purple.svg" alt="PRs">
  <img src="https://img.shields.io/badge/Made_with-React_Flow-FF007F.svg" alt="React Flow">
  
  <h1>🌟 ArchitectAI 🌟</h1>
  <h3>Multi-LLM Cloud Infrastructure Agent</h3>
  <p>Transforming natural language requirements into production-ready AWS architectures.</p>
</div>

---
(Note:This is a personal version of the project that i will be maintaining and updating.
The original hackathon repo is linked here: [Original repository](https://github.com/Adrish-alias/Architect_Ai))
## 🚀 Overview

**ArchitectAI** is a sophisticated generative AI agent designed to act as your automated Solutions Architect. It bridges the gap between high-level business goals and technical cloud implementations by transforming natural language descriptions into a comprehensive, multi-tiered AWS architecture.

### 💡 Why ArchitectAI?
Designing enterprise-grade cloud infrastructure traditionally requires deep domain expertise and days of manual diagrams. ArchitectAI delivers:
- **Instant Productivity**: Move from idea to architecture in seconds.
- **Expert Guidance**: Built-in best practices for cost, performance, and security.
- **Live Interaction**: Edit and pivot your design in real-time, not in a static image.
- **Deep Auditing**: Automatically detect anti-patterns before they become costly mistakes.

---

## ✨ Key Features & Application Visuals

### 1. AI-Powered Requirement Classification
<p align="center">
  <img src="assets/generator-input.png" alt="Project Input and Tiered Generation" width="900"/>
</p>
Simply input your project idea, user scale, budget, and key features. ArchitectAI's agentic workflow intelligently classifies your requirements to instantly provision three distinct infrastructure tiers: Cost-Optimized, Balanced, and High-Performance. 

### 2. Deep Architecture Analysis & Error Detection
<p align="center">
  <img src="assets/analyser-diagram.png" alt="Architecture Analyser Highlighting Issues" width="900"/>
</p>
<p align="center">
  <img src="assets/analyser-issues.png" alt="Architecture Issue Details" width="900"/>
</p>
The intelligent Analyser actively audits your existing architecture. It visually tags nodes directly on the graph and extracts detailed recommendations—such as detecting over-provisioned services (Cost Issues), missing service discovery, and architectural anti-patterns (e.g., direct DB access).

### 3. Interactive React Flow Diagrams
<p align="center">
  <img src="assets/architecture-diagram.png" alt="Interactive React Flow Diagram" width="900"/>
</p>
Experience your cloud infrastructure through fully interactive, zoomable, and editable node-based graphs. Powered by React Flow, trace exactly how components like Amazon Cognito, API Gateway, and ECS Fargate securely connect.

### 4. Granular Cost Estimation & Planning
<p align="center">
  <img src="assets/cost-analysis.png" alt="Cost Analysis and Implementation Plan" width="900"/>
</p>
Get precise monthly and annual financial projections calibrated dynamically to your workload size. Break down expenditures service-by-service and receive a phase-by-phase Implementation Roadmap to safely guide your deployment.

---

## 🧠 The Dual-LLM Pipeline 

ArchitectAI relies on a pioneering **Multi-LLM orchestration** strategy to maximize accuracy, syntactically correct layouts, and logical reasoning.

1. **Requirement Classification (Meta Llama 3-70B)**: Employs large context analysis to map out Scale, Compute Intensity, Data Complexity, and Real-Time operational needs.
2. **Service Mapping (Meta Llama 3-70B)**: Maps the refined requirements directly to optimal AWS services (e.g., matching ECS over Lambda, or DynamoDB over RDS).
3. **Drafting Assembly**: Structures logical JSON graphs connecting services dynamically.
4. **Syntax Healing (Google Gemini 2.5 Flash)**: Executes error-recovery parsing to fix malformed layouts, ensuring pristine React Flow structures.
5. **Architectural Review (Google Gemini 2.5 Flash)**: Final pass "Senior Review" to sanity check component flows, security boundaries, and projected costs.

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, React Flow, React Router DOM, Vanilla CSS |
| **Backend** | Node.js, Express.js |
| **AI / Models** | Amazon Bedrock (Meta Llama 3-70B), Google Gemini 2.5 Flash |

---

## 📂 Repository Structure

```text
ArchitectAI/
├── backend/                  # Express.js Server & LLM Orchestration
│   ├── .env                  # Secrets (Bedrock & Gemini Keys)
│   ├── server.js             # Multi-stage Agent logic
│   └── package.json          # Server dependencies
├── frontend/                 # Client-side codebase
│   └── react-app/
│       ├── src/              # React components & React Flow hooks
│       ├── public/           # Static assets
│       ├── index.html        # App entry point
│       └── vite.config.js    # Vite configuration
├── assets/                   # Application screenshots & Media
└── README.md                 # Project documentation
```

---

## ⚙️ Quick Start Installation

Follow these instructions to get ArchitectAI running in your local environment.

### 1. Prerequisites
Ensure you have Node.js installed, then create a `.env` file in the `backend` directory containing your API credentials:
```env
GEMINI_API_KEY=your_gemini_key_here
AWS_BEARER_TOKEN_BEDROCK=your_bedrock_token_here
```

### 2. Clone the Repository
```bash
git clone https://github.com/Adrish-alias/ArchitectAI.git
cd ArchitectAI
```

### 3. Start the Backend Server
```bash
cd backend
npm install
npm start
```

### 4. Start the Frontend App
Open a new terminal window/tab:
```bash
cd frontend/react-app
npm install
npm run dev
```

The application will launch on your local host (usually `http://localhost:5173`).

---

## 🔮 Future Roadmap

- [ ] **Infrastructure as Code (IaC) Export**: One-click generation of production-ready Terraform modules and AWS CDK scripts.
- [ ] **Live Price Aggregation**: Integration with the official AWS Pricing API for dynamically shifting, region-specific cost insights.
- [ ] **Multi-Cloud Equivalency**: Expanded ontology maps to generate matching Google Cloud Platform (GCP) and Microsoft Azure layouts.
- [ ] **Security Auditing**: Strict compliance scanning against the AWS Well-Architected Framework guidelines.

---

## 🤝 Core Contributors

Crafted with passion by the ArchitectAI Team:
- [**Adrish Chatterjee**](https://github.com/Adrish-alias)
- [**Ansh Singh**](https://github.com/AnshSingh-2024)
- [**Nakshtra Agrawal**](https://github.com/nakshtraagrawal)
- [**Pratyush Parashar**](https://github.com/pratyuxxhh)

---

<div align="center">
  <p>Built under the <b>MIT License</b>.</p>
</div>
