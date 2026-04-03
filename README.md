# ArchitectAI — Multi-LLM Cloud Infrastructure Agent

**ArchitectAI** is a sophisticated generative agent designed to bridge the gap between business requirements and cloud implementation. It transforms natural language descriptions into production-ready AWS architecture designs, providing a comprehensive 5-stage analysis that balances cost, performance, and scalability.

## 🚀 Key Features

* **3-Tiered Generation**: Automatically generates architecture variants for **Cost-Optimized** (Free Tier focus), **Balanced** (Standard Production), and **High-Performance** (Distributed/Enterprise) workloads.
* **Intelligent Architecture Analyser**: Performs deep-link audits of existing Mermaid diagrams to detect over-engineering, missing critical services, and architectural anti-patterns.
* **Interactive React Flow Diagrams**: Moves beyond static images by rendering fully interactive, zoomable, and editable node-based diagrams for real-time design adjustments.
* **Agentic Cost Estimation**: Delivers granular monthly and annual infrastructure cost projections calibrated to the specific scale and complexity of the project.
* **Automated Implementation Roadmap**: Generates a phase-by-phase deployment strategy and task list to guide the transition from design to cloud deployment.

## 🧠 The Multi-LLM Pipeline (Agentic Workflow)

ArchitectAI utilizes a unique **dual-LLM orchestration** strategy to ensure high-fidelity JSON outputs and syntactically correct diagrams:

1.  **Requirement Classification (Llama 3-70B)**: Analyzes user input to classify the project across Scale, Compute Intensity, Data Complexity, and Real-time needs.
2.  **Service Selection (Llama 3-70B)**: Maps requirements to specific AWS services (e.g., Lambda vs. ECS, DynamoDB vs. OpenSearch) based on inferred architectural tiers.
3.  **JSON Assembly**: Structures the architectural logic into a machine-readable schema.
4.  **Syntax Validation & Recovery**: Uses custom algorithms and **Gemini 2.5 Flash** to repair truncated responses or malformed Mermaid code.
5.  **Final Optimization (Gemini 2.5 Flash)**: Performs a "Senior Architect Review" to validate data flows, security patterns, and cost sanity.

## 🛠️ Tech Stack

* **Frontend**: React + Vite, **React Flow** (Visualization Engine), Mermaid.js, Vanilla CSS.
* **Backend**: Node.js, Express.
* **AI/ML**: **Amazon Bedrock (Meta Llama 3-70B)**, **Google Gemini 2.5 Flash**.

## ⚙️ Installation & Setup

### Prerequisites
You will need the following environment variables in a `.env` file:
* `GEMINI_API_KEY`
* `AWS_BEARER_TOKEN_BEDROCK`

### Setup Steps
1.  **Clone the Repository**:
    ```bash
    git clone [https://github.com/Adrish-alias/ArchitectAI.git](https://github.com/Adrish-alias/ArchitectAI.git)
    cd ArchitectAI
    ```
2.  **Backend Configuration**:
    Navigate to the `server` directory, run `npm install`, and create your `.env` file. Start the server using `npm run start`.
3.  **Frontend Configuration**:
    Navigate to the `react-app` directory, run `npm install`, and start the development server with `npm run dev`.

## 👥 Contributors

* [**Adrish Chatterjee**](https://github.com/Adrish-alias)
* [**Ansh Singh**](https://github.com/AnshSingh-2024)
* [**Nakshtra Agrawal**](https://github.com/nakshtraagrawal)
* [**Pratyush Parashar**](https://github.com/pratyuxxhh)

## 🔮 Future Roadmap

* **IaC Export (Terraform/CDK)**: One-click export of the generated architecture into production-ready Terraform modules or AWS CDK code.
* **Live Cost Tracking API**: Integration with the AWS Price List API to provide real-time, region-specific pricing updates instead of static estimated ranges.
* **Multi-Cloud Support**: Expanding the mapping logic to support **Google Cloud Platform (GCP)** and **Microsoft Azure** service equivalents.
* **Security & Compliance Audit**: Automated scanning of generated designs against the **AWS Well-Architected Framework**.

## ⚖️ License

This project is licensed under the **MIT License**.