<div align="center">

# 🔭 RepoLens V2

**A Full-Stack Code Intelligence Platform — Static Analysis, Security Posture & Dependency Graphing.**

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Babel-AST%20Parsing-F9DC3E?style=for-the-badge&logo=babel&logoColor=black" alt="Babel" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
</p>

### 🌐 [Live Demo → repo-lens-lovat.vercel.app](https://repo-lens-lovat.vercel.app/)

---

</div>

## 📖 Table of Contents

- [🌐 Overview](#-overview)
- [⚙️ Core Engines](#️-core-engines)
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [🗄 Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
- [🚀 Getting Started](#-getting-started)
- [⚠️ Known Limitations](#️-known-limitations)

---

## 🌐 Overview

> **RepoLens V2** is a full-stack Code Intelligence Platform that audits your technical debt, maps your architecture, and flags critical security vulnerabilities — all from a single GitHub connection.

Unlike standard "AI wrappers" that blindly pass raw source code to an LLM, RepoLens uses a multi-pass **deterministic engine** architecture. It performs deep structural AST parsing and lexical regex scanning entirely in-house using Node.js. The LLM is strictly a presentation layer — it reads a compressed JSON schema of our deterministic findings and produces human-readable summaries, reducing token costs by ~98%.

> ⚠️ **Language Support:** The deterministic static analysis and dependency graphing engines are currently optimized for **JavaScript and TypeScript (JS/TS)**.

---

## ⚙️ Core Engines

RepoLens is powered by a backend pipeline of independent, deterministic services:

### 1. 🔗 Dependency Graph Engine
- Parses source files into a **Babel Abstract Syntax Tree (AST)**
- Traverses `ImportDeclaration` nodes to map cross-file dependencies and external package usage
- Outputs a directed acyclic graph (DAG) rendered interactively via **ReactFlow**

### 2. 📊 Static Analysis Engine
- Evaluates **cognitive complexity** without AI
- Calculates exact Lines of Code (LOC), function counts, component counts, nesting depth, and largest function sizes per file

### 3. 🛡️ Security Scanner
- **Lexical Pass:** Fast regex checks for hardcoded AWS keys, secrets, and dangerous DOM injections (`localStorage`, `dangerouslySetInnerHTML`)
- **Structural Pass:** AST tree-walking to detect unsafe patterns like `eval()` and dangerous dynamic imports

### 4. 🏆 Scoring Engine
- Mathematically calculates a **0–100 Health Score** across four pillars:
  - **Maintainability** (35%) — complexity, nesting, function size
  - **Security** (35%) — vulnerability count and severity
  - **Architecture** (20%) — dependency structure and coupling
  - **Documentation** (10%) — comment coverage and doc presence

### 5. 🤖 AI Presentation Layer (OpenRouter)
- Raw source code is **never** sent to the LLM
- A compressed deterministic JSON schema is passed instead — the LLM translates it into readable architecture summaries and onboarding guides

---

## ✨ Features

### 🔍 Code Explorer
- Select any file from your connected GitHub repos and run **AI-powered line-by-line analysis**
- Or paste code manually in the **Manual mode** for instant analysis without a repo connection
- Tabs: **Overview**, **Functions** (per-function complexity + suggestions), **Notable Lines**, **Security**

### 📊 Intelligence Dashboard
- Aggregated metrics overview across all your scanned repositories
- Recent scans, health score trends, and top security findings at a glance

### 🕸️ Interactive Dependency Graph
- Fully interactive ReactFlow graph mapping how files and modules import each other
- **Search**, **Focus Mode** (dim unconnected nodes), and **Hide External** filters
- Export graph as PNG

### 🛡️ Security Posture Panel
- Grouped vulnerability analysis with animated Severity Donut and Bar charts
- Filter findings by CRITICAL / HIGH / MEDIUM / LOW severity, mapped to specific lines of code

### ⚖️ Side-by-Side Scan Comparison
- Compare two historical scans to track metric regressions, vulnerability resolutions, and architecture drift over time

### 📜 Analysis History
- Full log of all past scans with timestamps, health scores, and quick-access links
- Select any two scans and jump straight to the comparison view

### 🔎 Universal Command Palette (⌘K)
- Instantly search across repositories, historical scans, security findings, and individual files from anywhere in the app

### 🔐 Authentication
- **Email / Password** with JWT (`httpOnly` cookie sessions)
- **GitHub OAuth** — connect your GitHub account to unlock repo scanning
- **Google OAuth** — sign in with your Google account

---

## 🛠 Tech Stack

### 💻 Backend (`/server`)

| Technology | Role |
|:---|:---|
| **Express 5** | HTTP server framework |
| **Babel AST** (`@babel/parser`, `@babel/traverse`) | Deep code parsing and traversal |
| **Prisma 6** | Type-safe ORM + database migrations |
| **PostgreSQL** | Primary relational database |
| **Octokit** | GitHub API client for fetching repo contents |
| **JSON Web Token** | Stateless dual-token session management (`httpOnly` cookies) |
| **bcryptjs** | Password hashing |
| **google-auth-library** | Google OAuth verification |
| **OpenRouter (Axios)** | AI layer for human-readable summaries |
| **Nodemon** | Dev server hot-reload |

### 🖥 Frontend (`/client`)

| Technology | Role |
|:---|:---|
| **React 19** | Core UI component library |
| **Vite 8** | Build tool and dev server |
| **TailwindCSS 4** | Utility-first styling |
| **React Router DOM 7** | Client-side routing and navigation |
| **ReactFlow (`@xyflow/react`)** | Interactive dependency graph rendering |
| **GSAP + @gsap/react** | Animations and scroll-triggered effects |
| **react-markdown** | Rendering AI-generated markdown summaries |
| **dagre** | Automatic graph layout algorithm |
| **html-to-image** | Export dependency graph as PNG |
| **@react-oauth/google** | Google OAuth login |

---

## 🏗 Architecture

```mermaid
graph TD
    subgraph Client ["React 19 + Vite (Vercel)"]
        A[Dashboard & UI] --> B[ReactFlow Graph]
        A --> C[Command Palette ⌘K]
        A --> D[Code Explorer]
    end

    subgraph Server ["Express 5 (Render)"]
        E[Auth Routes] --> F[JWT Middleware]
        G[Analysis Pipeline] --> H[Babel AST Parser]
        H --> I[Dependency Grapher]
        H --> J[Static Analyzer]
        H --> K[Security Scanner]
        J --> L[Scoring Engine]
        K --> L
        G --> M[GitHub API via Octokit]
    end

    subgraph AI ["OpenRouter"]
        N[LLM — JSON Schema → Summary]
    end

    subgraph DB ["PostgreSQL (Prisma)"]
        O[(Users, Scans, Metrics, Findings, Graph, Health)]
    end

    Client -- "API Requests (JWT)" --> Server
    Server -- "Write Results" --> DB
    DB -- "Aggregated JSON Schema" --> N
    N -- "Markdown Summary" --> Client
```

---

## 🗄 Database Schema

RepoLens uses a normalized PostgreSQL schema managed through Prisma:

| Model | Description |
|:---|:---|
| `User` | Auth details, GitHub token, Google ID, profile pic |
| `Repository` | GitHub repo metadata linked to a user |
| `RepositoryScan` | Tracks async scan status (`PENDING` → `COMPLETED`) and timestamps |
| `RepositoryFile` | Individual files analyzed per scan |
| `FileMetrics` | AST-parsed per-file metrics (LOC, depth, function count) |
| `SecurityFinding` | Discovered vulnerabilities with severity, file, line, and recommendation |
| `DependencyGraph` | Serialized nodes/edges JSON for the ReactFlow graph |
| `HealthScore` | The four 0–100 pillar scores per scan |

---

## 📡 API Reference

All routes are protected by JWT (`verifyToken` middleware) unless noted. Base URL: `http://localhost:3000`

### 🔐 Auth (`/auth`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/auth/register` | Register with email/password |
| `POST` | `/auth/login` | Login and receive JWT cookies |
| `POST` | `/auth/logout` | Clear session cookies |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current authenticated user |
| `GET` | `/auth/github` | Initiate GitHub OAuth flow |
| `GET` | `/auth/github/callback` | GitHub OAuth callback |

### 📦 Repositories (`/repos`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/repos` | List user's GitHub repositories |
| `GET` | `/repos/:owner/:repo` | Get repository details |
| `GET` | `/repos/:owner/:repo/files` | Browse repo files (immediate children of a path) |
| `GET` | `/repos/:owner/:repo/tech-stack` | Fetch root `package.json` details |

### 🔬 Analysis (`/analysis`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/analysis/run` | Trigger a full background repo scan |
| `POST` | `/analysis/manual` | Analyze a manually pasted file |
| `POST` | `/analysis/explore` | Code Explorer — analyze pasted code with AI |
| `POST` | `/analysis/explore-repo` | Code Explorer — analyze a file from a repo |
| `POST` | `/analysis/generate-docs` | AI-generate documentation for a repo |
| `POST` | `/analysis/ask` | Chat with AI assistant using scan context |
| `GET` | `/analysis/history` | All past scans for the current user |
| `GET` | `/analysis/dashboard-stats` | Aggregated dashboard metrics |
| `GET` | `/analysis/compare` | Compare two scans side-by-side |
| `GET` | `/analysis/search` | Global search across repos, files, findings |
| `GET` | `/analysis/:id` | Get a specific analysis by ID |

### 📋 Scans (`/scan`)
| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/scan` | Start a new scan |
| `GET` | `/scan/:id` | Get full scan payload (metrics, graph, health, security) |
| `GET` | `/scan/:id/status` | Poll scan status |
| `GET` | `/scan/:id/files` | Get analyzed files for a scan |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v20+
- **PostgreSQL** database
- **GitHub OAuth App** (Client ID + Secret)
- **Google OAuth Client** (Client ID)
- **OpenRouter API Key**

### 1. Clone & Install

```bash
git clone https://github.com/your-username/RepoLens.git
cd RepoLens

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Server (`server/.env`)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/repolens

CLIENT_URL=http://localhost:5173

ACCESS_TOKEN_SECRET=your_access_secret
REFRESH_TOKEN_SECRET=your_refresh_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

GOOGLE_CLIENT_ID=your_google_client_id

OPENROUTER_API_KEY=your_openrouter_key
```

### 3. Configure Client (`client/.env`)

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Set Up Database & Run

**Server:**
```bash
cd server
npx prisma db push   # Push schema to your database
npm run dev          # Starts on http://localhost:3000
```

**Client:**
```bash
cd client
npm run dev          # Starts on http://localhost:5173
```

### 5. GitHub OAuth Setup

In your GitHub Developer Settings → OAuth Apps:
- **Homepage URL:** `http://localhost:5173`
- **Authorization callback URL:** `http://localhost:3000/auth/github/callback`

---

## ⚠️ Known Limitations

- **Top 50 Files:** To respect GitHub API rate limits, the scan pipeline analyzes only the top 50 most critical source files per scan.
- **JS/TS Only:** The deterministic AST parser (Babel) is optimized for JavaScript and TypeScript. Other languages fall back to regex-only scanning.
- **Shallow Security:** The security scanner catches predefined unsafe patterns (hardcoded secrets, `eval()`, dangerous DOM injections) with 100% accuracy — but cannot detect complex multi-file business logic vulnerabilities.
- **File Upload:** File upload in Code Explorer is currently not available. Use the **Paste** mode or connect a GitHub repo instead.

---

<div align="center">
  <p><i>Built with ♥ using React, Babel AST, Prisma, Express, and OpenRouter</i></p>
</div>
