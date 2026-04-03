# ArchitectAI — AI-Powered AWS Architecture Generator

ArchitectAI is a web application that helps users convert simple business ideas into well-structured AWS architecture solutions within minutes. It simulates a real solution architect conversation, generating tailored cloud architectures based on your unique requirements, scale, and budget.

## Features

- **Generative AI Cloud Architecture**: Enter a simple business idea (e.g., “build a real-time analytics platform”), and the system generates multiple architecture options:
  - **Cost-Optimized**: Serverless-first, minimal services, leveraging the AWS Free Tier.
  - **Balanced**: Right-sized for standard production workloads.
  - **High-Performance**: Distributed, multi-AZ, enterprise-grade architecture.
- **Interactive Visual Diagrams**: Fully interactive, editable React Flow diagrams. You can zoom, pan, edit node labels, and review connections between services.
- **Analyze Your Architecture**: Evaluate an existing diagram. The AI detects over-engineering, missing critical services, anti-patterns, and cost inefficiencies. It also suggests an optimized alternative.
- **Detailed Cost Estimates**: Provides realistic monthly/annual infrastructure cost projections broken down per AWS service.
- **Implementation Strategy**: Provides a phase-by-phase implementation plan and task list for deploying your architecture.

## Tech Stack

**Frontend:**
- **React + Vite**: Fast, modern frontend framework.
- **React Flow**: For rendering interactive, editable node-based diagrams.
- **Mermaid.js**: Used for underlying architecture representations.
- **Vanilla CSS**: Aesthetic glassmorphism UI with smooth animations.

**Backend:**
- **Node.js & Express**: Lightweight REST API.
- **AWS Bedrock (Llama 3)**: Primary LLM for structuring complex JSON architecture proposals.
- **Google Gemini**: Secondary validation LLM to guarantee proper structure, Mermaid syntax recovery, and sanity checks.

## Installation & Setup

You will need two API keys to run the backend generative pipelines:
- `GEMINI_API_KEY`
- `AWS_BEARER_TOKEN_BEDROCK`

### 1. Setup the Backend Server
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and export the following context:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   AWS_BEARER_TOKEN_BEDROCK=your_bedrock_token_here
   PORT=5000
   ```
4. Start the server:
   ```bash
   npm run start
   ```

### 2. Setup the React Frontend
1. Navigate to the `react-app` directory from the repository root:
   ```bash
   cd react-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the web interface in your browser (typically `http://localhost:5173`).

## Usage Guide
1. **Generate**: Describe your app idea, user count, and feature needs. Click Generate. Choose between Cost, Balanced, and Performance options using the sidebar tabs.
2. **Analyze**: Head to the "Analyze Architecture" page. Paste an existing Mermaid diagram and a brief description. Discover potential issues such as "Anti-Pattern" or "Cost Inefficiencies" and review the AI-proposed optimized architecture.
