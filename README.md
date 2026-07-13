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
- [⚙️ Core Engines (Not Just an AI Wrapper)](#-core-engines-not-just-an-ai-wrapper)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [🗄 Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
- [🚀 Getting Started](#-getting-started)

---

## 🌐 Overview

> **RepoLens V2** is a full-stack Code Intelligence Platform designed to audit your technical debt, map your architecture, and flag critical security vulnerabilities. 

Unlike standard "AI Wrappers" that blindly dump source code into an LLM, RepoLens utilizes a multi-pass **deterministic engine** architecture. It performs deep structural AST parsing and lexical regex scanning entirely in-house using Node.js. LLMs are strictly relegated to a presentation layer—synthesizing our deterministic data into human-readable architecture summaries.

> ⚠️ **Note on Language Support:** Currently, the deterministic static analysis and dependency graphing engines are heavily optimized for **JavaScript and TypeScript (JS/TS)**.

---

## ⚠️ Known Limitations

While highly optimized for speed and cost, the current "Full Repository Scan (Top 50 Files)" architecture has a few intentional trade-offs:
- **Incomplete Context:** To respect GitHub API rate limits and keep scans fast, the deep analysis pipeline only fetches and analyzes the **Top 50** most critical source files per scan.
- **Shallow Security Checks:** Security scanning relies on deterministic rules (Regex and AST parsing). This catches obvious flaws (e.g., hardcoded secrets, `eval()` usage) perfectly, but it cannot catch complex, multi-file business logic vulnerabilities. However, it does guarantee 100% detection of predefined unsafe patterns like dynamic imports and dangerous DOM injections within the analyzed files.
- **Surface-Level Architecture:** Architecture summaries are deduced from dependency graphs and file names, not a deep semantic understanding of every file's logic.

---

## ⚙️ Core Engines (Not Just an AI Wrapper)

RepoLens is powered by a robust backend pipeline of independent, deterministic services:

1. **The Dependency Graph Engine:**
   - Parses code into a Babel Abstract Syntax Tree (AST).
   - Traverses `ImportDeclaration` nodes to map cross-file dependencies and external package usages.
   - Outputs a massive, directed acyclic graph (DAG) rendered seamlessly via ReactFlow.
2. **The Static Analysis Engine:**
   - Evaluates cognitive complexity without AI.
   - Calculates exact Lines of Code (LOC), function counts, component counts, nesting depth, and largest function sizes per file.
3. **The Security Scanner:**
   - **Lexical Pass:** Fast regex checks for hardcoded AWS keys, secrets, and dangerous DOM injections (`localStorage`, `dangerouslySetInnerHTML`).
   - **Structural Pass:** AST tree-walking to detect unsafe structural implementations like `eval()` and dangerous dynamic imports.
4. **The Scoring Engine:**
   - Mathematically calculates a 0-100 Health Score by weighing technical debt (e.g., deep nesting penalties) against critical security findings.
5. **The AI Presentation Layer (OpenRouter):**
   - We **never** pass your raw source code to an LLM. Instead, we compress the findings from the engines above into a deterministic JSON schema. The LLM simply translates this dense schema into readable onboarding guides and architecture summaries, reducing token costs by ~98% compared to sending full raw source files to the LLM and ensuring high accuracy.

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
