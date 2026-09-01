# Architect AI AWS Architecture Knowledge Base — Extraction Report

## Summary
- Architecture records: **16**
- Distinct source PDF filenames represented in the supplied Gemini output: **10**
- Conversion: Gemini Markdown-wrapped JSON → validated JSONL/JSON files.

## Architecture Records
- `aws-architecture-001` — **Classic Highly Available Web Application** (web_application)
- `aws-architecture-002` — **Serverless Single-Page Application (SPA)** (serverless)
- `aws-architecture-003` — **Serverless Mobile Backend** (mobile)
- `aws-architecture-004` — **Serverless Microservices with AWS Fargate** (microservices)
- `aws-architecture-005` — **Event Sourcing Pattern on AWS** (event_driven)
- `aws-architecture-006` — **Serverless SaaS Architecture** (saas)
- `aws-architecture-007` — **Amazon EKS SaaS Architecture** (saas)
- `aws-architecture-008` — **Full Stack (Silo) Isolation SaaS** (saas)
- `aws-architecture-009` — **AWS Security Reference Architecture (SRA) - Core Multi-Account** (security)
- `aws-architecture-010` — **Serverless Data Lake Framework** (data_lake)
- `aws-architecture-011` — **Multi-Source Analytics Lakehouse with AI-Powered Insights** (analytics)
- `aws-architecture-012` — **Ecommerce Web Application Architecture** (ecommerce)
- `aws-architecture-013` — **Serverless In-Game Screenshot Processing Pipeline** (image_processing)
- `aws-architecture-014` — **Multi-Region API Gateway with CloudFront Architecture** (multi_region)
- `aws-architecture-015` — **Saga Execution Coordinator Pattern** (microservices)
- `aws-architecture-016` — **Message Bus (Publish-Subscribe) Pattern** (event_driven)

## Source → Record Mapping
- **Web Application Architecture on AWS** (`web-application-architecture.pdf`): aws-architecture-001
- **Web Application Hosting in the AWS Cloud** (`web-application-hosting-best-practices.pdf`): aws-architecture-001
- **AWS Serverless Multi-Tier Architectures with Amazon API Gateway and AWS Lambda** (`serverless-multi-tier-architectures-api-gateway-lambda.pdf`): aws-architecture-002, aws-architecture-003
- **Implementing Microservices on AWS** (`microservices-on-aws.pdf`): aws-architecture-004, aws-architecture-005, aws-architecture-015, aws-architecture-016
- **SaaS Lens** (`wellarchitected-saas-lens.pdf`): aws-architecture-006, aws-architecture-007, aws-architecture-008
- **AWS Security Reference Architecture (AWS SRA) - core architecture** (`security-reference-architecture.pdf`): aws-architecture-009
- **Guidance for Data Lakes on AWS** (`data-lakes-on-aws.pdf`): aws-architecture-010, aws-architecture-011
- **Guidance for Web Store on AWS** (`web-store-on-aws.pdf`): aws-architecture-012
- **Serverless In-Game Screenshot Processor Pipeline for Game Studios** (`serverless-in-game-screenshot-processor-pipeline-game-studios.pdf`): aws-architecture-013
- **Multi-region API Gateway with CloudFront** (`multi-region-api-gateway-with-cloudfront.pdf`): aws-architecture-014

## Conversion / Validation
- Extracted exactly 16 architecture objects from the supplied Gemini output.
- Removed Markdown escaping that made the JSON invalid (`\_`, `\:`, and `\@`).
- Normalized `additional_sources` to a top-level record field where Gemini nested it under `source`.
- Verified all 16 JSONL lines independently parse with a JSON parser.
- Verified all 16 IDs are unique.
- Verified every record contains the expected core schema fields.

## Important Limitation
- The supplied Gemini output's manifest names 9 source PDF filenames. It references an additional source for the first architecture, but the tenth original PDF is not identifiable from the supplied output. I have **not invented a missing source**.
- The conversion preserves Gemini's substantive extracted architecture content rather than independently re-interpreting the AWS PDFs.

## Next Step
Review the records before generating embeddings. In particular, inspect architecture connections, `required` service flags, and source page numbers before treating this corpus as production knowledge.
