<div align="center">

# 🔭 RepoLens V2

**A High-Performance Static Analysis, Security Posture, and Dependency Graphing Engine.**

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Babel-AST%20Parsing-F9DC3E?style=for-the-badge&logo=babel&logoColor=black" alt="Babel" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
</p>

### 🌐 [Live Demo: repo-lens-lovat.vercel.app](https://repo-lens-lovat.vercel.app/)

---

</div>

## 📖 Table of Contents

- [🌐 Overview](#-overview)
- [📸 Screenshots](#-screenshots)
- [⚠️ Known Limitations](#️-known-limitations)
- [⚙️ Core Engines (Not Just an AI Wrapper)](#️-core-engines-not-just-an-ai-wrapper)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#️-architecture)
- [🗄 Database Schema](#️-database-schema)
- [📡 API Reference](#-api-reference)
- [🚀 Getting Started](#-getting-started)

---

## 🌐 Overview

> **RepoLens V2** is a full-stack Code Intelligence Platform designed to audit your technical debt, map your architecture, and flag critical security vulnerabilities. 

Unlike standard "AI Wrappers" that blindly dump source code into an LLM, RepoLens utilizes a multi-pass **deterministic engine** architecture. It performs deep structural AST parsing and lexical regex scanning entirely in-house using Node.js. LLMs are strictly relegated to a presentation layer—synthesizing our deterministic data into human-readable architecture summaries.

> ⚠️ **Note on Language Support:** Currently, the deterministic static analysis and dependency graphing engines are heavily optimized for **JavaScript and TypeScript (JS/TS)**.

---

## 📸 Screenshots

### 🖥️ Intelligence Dashboard
> Aggregated health metrics, recently scanned repos, security overview, and health trend — all at a glance.

![Dashboard](./screenshots/dashboard.png)

---

### 📁 Connected Repositories
> Browse and manage all your GitHub repositories synced to RepoLens.

![Repositories](./screenshots/repositories.png)

---

### 🔍 Scan Detail — Overview & Health
> Per-scan intelligence summary with architecture breakdown, metrics, and AI-generated repository documentation.

![Scan Detail](./screenshots/scan_detail.png)

---

### `</>` Code Explorer
> Select any file from your repository, browse the lazy-loaded file tree, and get a line-by-line AI deep-dive with security report.

![Code Explorer](./screenshots/code_explorer.png)

---



## 🧠 Architecture & Design Philosophy (Not Just an AI Wrapper)

RepoLens utilizes a **Dual Architecture** to balance deep intelligence with scalability, cost, and privacy.

### 1. Manual Analysis (V1 Architecture)
When you scan a single file manually, RepoLens sends the raw source code to the LLM (GPT-4o-mini). Because a single file is well within token limits, the AI acts as the primary SAST engine, reading every line and dynamically generating hyper-specific remediation advice based on the exact variables and logic it sees.

### 2. Full Repository Scans (V1.5 Architecture)
When scanning a full repository (top 50 files), sending raw code to an LLM is a disaster. It breaks token limits, costs a fortune, and causes massive AI hallucinations ("lost in the middle"). 

For full repository scans, **the AI never sees your raw source code.** Instead, RepoLens relies on a robust backend pipeline of independent, deterministic services:

1. **The Dependency Graph Engine:** Babel AST traverses `ImportDeclaration` nodes to map cross-file dependencies.
2. **The Static Analysis Engine:** Calculates exact LOC, nesting depth, and cognitive complexity without AI.
3. **The Security Scanner:** Uses Regex and AST tree-walking to detect unsafe structural implementations (e.g., `eval()`, hardcoded secrets) with 100% mathematical certainty.

The local server saves these generic finding objects to PostgreSQL. **Only the resulting abstract JSON metadata is sent to the LLM.** 

### Why this Hybrid AST + AI approach?
- **Defeating Token Limits & Cost:** We compress 20,000 lines of code into a tiny JSON payload, reducing token costs by ~98%.
- **Eliminating AI Hallucinations:** The AI operates on a foundation of absolute truth derived from AST. It cannot hallucinate a vulnerability if the AST parser didn't feed it one.
- **Guaranteeing Source Code Privacy:** Because the AST parsing happens on the local server, your raw proprietary source code never leaves your backend infrastructure during a repo scan. 

We use **Deterministic Code to do the scanning**, and **AI to do the storytelling** (synthesizing metrics into onboarding guides and architectural overviews).

---

## ✨ Features

### 🚀 Massive UI & UX Upgrade
- **Dark Terminal Aesthetic** — A completely redesigned interface featuring rich `#050508` dark mode, glassmorphism panels, interactive micro-animations, and custom scrollbars.
- **Universal Command Palette (⌘K)** — Instantly search across repositories, historical scans, security findings, and files.

### 📊 Explainable Health Metrics
- **Transparent Scoring** — The overall health score is now visually broken down into its four pillars: Maintainability (35%), Security (35%), Architecture (20%), and Documentation (10%).

### 🕸️ Interactive Dependency Graph
- Enhanced ReactFlow graph that maps how files and modules import each other.
- Features **Search**, **Focus Mode** (dimming unconnected nodes), and **Hide External** filters.

### 🛡️ Security Posture Panel
- Grouped vulnerability analysis featuring animated Severity Donut and Bar charts.
- Quickly filter between CRITICAL, HIGH, MEDIUM, and LOW severity risks mapped to specific lines of code.

### ⚖️ Side-by-Side Comparison
- Compare two historical repository scans to track metric regressions, security vulnerability resolutions, and architecture drift over time.

---

## 🛠 Tech Stack

### 💻 Backend (`/server`)

| Technology | Role |
|:---|:---|
| **Express 5** | High-performance HTTP server framework |
| **Babel AST** | Deep code parsing and traversal |
| **Prisma 6** | Type-safe ORM + database migrations |
| **PostgreSQL** | Primary relational database |
| **JSON Web Token** | Stateless, dual-token session management (`httpOnly` cookies) |
| **OpenRouter (Axios)**| AI layer for human-readable summaries |

### 🖥 Frontend (`/client`)

| Technology | Role |
|:---|:---|
| **React 19** | Core UI component library |
| **Vite 8** | Next-generation build tool and dev server |
| **TailwindCSS 4** | Utility-first styling (supplemented with rich vanilla CSS) |
| **React Router DOM 7** | Client-side routing and navigation |
| **ReactFlow** | Dependency graph rendering |

---

## 🏗 Architecture

<!-- TODO: re-add architecture diagram image -->

```mermaid
graph TD
    subgraph Client [React 19 + Vite]
        A[Dashboard & UI] --> B[ReactFlow Canvas]
        A --> C[Global Search ⌘K]
    end

    subgraph Engines [Node.js Pipeline]
        D[Babel AST Parser] --> E[Dependency Grapher]
        D --> F[Static Analyzer]
        D --> G[Security Scanner]
        F --> H[Scoring Engine]
        G --> H
    end

    subgraph Database [PostgreSQL]
        I[(Metrics, Findings, Graph, Health)]
    end
    
    subgraph AI [OpenRouter]
        J[Summarization LLM]
    end

    Client -- API Requests --> Engines
    Engines -- Write Results --> Database
    Database -- Aggregated JSON Schema --> J
    J -- Markdown Summary --> Client
```

---

## 🗄 Database Schema

RepoLens utilizes a highly normalized PostgreSQL schema mapped through Prisma.

- **`User`**: Tracks authentication details.
- **`RepositoryScan`**: Tracks the asynchronous background scan status and timestamps (`startedAt`, `completedAt`).
- **`RepositoryFile` & `FileMetrics`**: Stores AST-parsed metrics (Lines of Code, Depth) per file.
- **`SecurityFinding`**: Tracks discovered vulnerabilities (XSS, Hardcoded Secrets).
- **`DependencyGraph`**: Stores the serialized Node/Edge JSON graph.
- **`HealthScore`**: Stores the calculated 0-100 scores.

---

## 📡 API Reference

All routes are prefixed with the base URL (default: `http://localhost:3000`).

### 🔬 Scans (`/analysis`)
- `POST /analysis/run` - Triggers a V2 background scan pipeline.
- `GET /analysis/dashboard-stats` - Aggregated metrics for the home dashboard.
- `GET /analysis/search` - Global text search across repos, files, and findings.
- `GET /analysis/compare` - Compare two scan IDs side-by-side using Postgres aggregate queries.
- `POST /analysis/ask` - Chat with the AI assistant based on deterministic scan context.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** database
- **GitHub OAuth App**
- **OpenRouter API Key**

### 1. Clone & Install
```bash
git clone [INSERT REAL URL HERE]
cd RepoLens

# Install Server
cd server && npm install

# Install Client
cd ../client && npm install
```

### 2. Configure Environment (`server/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/repolens
CLIENT_URL=http://localhost:5173
ACCESS_TOKEN_SECRET=supersecret
REFRESH_TOKEN_SECRET=supersecret_refresh
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
OPENROUTER_API_KEY=your_key
```

### 3. Run the App
**Server:**
```bash
cd server
npx prisma db push
npm run dev
```

**Client:**
```bash
cd client
npm run dev
```

---

<div align="center">
  <p><i>Built with ♥ using React, Babel AST, Prisma, and Express</i></p>
</div>
