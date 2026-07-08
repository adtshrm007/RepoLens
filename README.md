<div align="center">

# 🔭 RepoLens

**AI-powered code intelligence platform — analyze, explore, and document any codebase in seconds.**

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-Express%205-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/OpenRouter-AI%20Backend-FF6B6B?style=for-the-badge" alt="OpenRouter" />
</p>

---

</div>

## 📖 Table of Contents

- [🌐 Overview](#-overview)
- [✨ What's New in V2](#-whats-new-in-v2)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [📁 Project Structure](#-project-structure)
- [🗄 Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
- [🔐 Authentication](#-authentication)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)

---

## 🌐 Overview

> **RepoLens V2** is a full-stack AI code analysis platform designed as a complete **Repository Intelligence Engine**. 

It connects directly to your GitHub account, scans your entire repository tree, and runs a comprehensive pipeline of static analysis, dependency mapping, and AI-powered intelligence. It surfaces structural insights, security vulnerabilities, complexity metrics, and automatically generates onboarding guides and architecture documentation—all from a clean, premium dark UI.

> ⚠️ **Note on Language Support:** Currently, the deterministic static analysis and dependency graphing engines are heavily optimized for **JavaScript and TypeScript (JS/TS)**.

### Supported Workflows:

| Workflow | Description |
|:---|:---|
| 🔍 **Repository Intelligence Scan** | Scans an entire GitHub repo recursively. Builds a dependency graph (DAG), calculates complexity metrics (dead code, large files), flags security vulnerabilities, and uses AI to generate an architecture summary. |
| ⚖️ **Side-by-Side Comparison** | Compare two historical repository scans to track metric regressions, security vulnerability resolutions, and architecture drift. |
| 🤖 **AI Repository Assistant** | Chat interactively with the OpenRouter LLM using the cached context of your repository scan to explain architecture or debug security findings. |

---

## ✨ What's New in V2

### 🚀 Massive UI & UX Upgrade
- **Dark Terminal Aesthetic** — A completely redesigned interface featuring rich `#050508` dark mode, glassmorphism panels, interactive micro-animations, and custom scrollbars.
- **Universal Command Palette (⌘K)** — Instantly search across repositories, historical scans, security findings, and files.
- **Keyboard Shortcuts** — Rapidly navigate the app using sequential shortcuts (e.g., `G` then `D` for Dashboard).
- **Toast Notifications** — Animated, globally accessible toast alerts for seamless user feedback.
- **Skeleton Loading States** — Smooth shimmer placeholders to prevent UI layout shifts during heavy data fetching.

### 📊 Explainable Health Metrics
- **Transparent Scoring** — The overall health score is now visually broken down into its four pillars: Maintainability (35%), Security (35%), Architecture (20%), and Documentation (10%).
- **Deduction Insights** — See exactly *why* a score is low (e.g., "Critical Vulnerability: -15pts", "Deep Nesting: -5pts").

### 🕸️ Interactive Dependency Graph
- Enhanced ReactFlow graph that maps how files and modules import each other.
- Features **Search**, **Focus Mode** (dimming unconnected nodes), and **Hide External** filters.
- **Export capabilities**: Download the graph as an SVG or high-resolution PNG.

### 🛡️ Security Posture Panel
- Grouped vulnerability analysis featuring animated Severity Donut and Bar charts.
- Quickly filter between CRITICAL, HIGH, MEDIUM, and LOW severity risks mapped to specific lines of code.

### 📥 Exportable Reports
- Generate and download deep-scan intelligence reports in **Markdown** (.md), **Raw JSON**, or print-optimized **PDFs**.

---

## 🛠 Tech Stack

### 💻 Backend (`/server`)

| Technology | Role |
|:---|:---|
| **Express 5** | High-performance HTTP server framework |
| **Prisma 6** | Type-safe ORM + database migrations |
| **PostgreSQL** | Primary relational database |
| **Octokit** | GitHub REST API client |
| **JSON Web Token** | Stateless session management |
| **bcryptjs** | Password hashing algorithm |
| **OpenRouter (Axios)**| Interfacing with AI LLMs |

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

```mermaid
graph TD
    subgraph Client [React 19 + Vite]
        A[AuthProvider] --> B[ProtectedRoute]
        B --> C[Pages: Dashboard, Compare, Search]
        C --> D[api.js Axios Interceptor]
    end

    subgraph Server [Express 5 + Node.js]
        E[server.js] --> F[Auth Routes]
        E --> G[Repo Routes]
        E --> H[Analysis Routes]
        
        F --> I[auth.service.js]
        G --> J[github.service.js]
        H --> K[ScannerService & analysis.service.js]
    end

    subgraph Database [PostgreSQL via Prisma]
        L[(User, Repository, Analysis, Findings)]
    end
    
    subgraph AI [OpenRouter]
        M[GPT-4o / Claude API]
    end

    D -- HTTP/Cookies --> E
    K -- Write Data --> L
    K -- Prompt JSON --> M
```

---

## 📁 Project Structure

```text
RepoLens/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                  # Root router
│   │   ├── Components/              # UI components, layout, common elements
│   │   ├── context/                 # AuthContext, ToastContext
│   │   ├── pages/                   # Dashboards, Code Explorer, Settings
│   │   ├── services/api.js          # Axios interceptors
│   │   └── index.css                # Global V2 design tokens and animations
│
└── server/                          # Express backend (Node.js)
    ├── prisma/                      # Database schema & migrations
    ├── src/
    │   ├── routes/                  # API route definitions
    │   ├── controllers/             # Business logic handlers
    │   ├── middleware/              # JWT and Google Token verifiers
    │   ├── services/                # Heavy AI, AST logic, and GitHub processing
    │   └── utils/                   # Helpers (Prisma singleton, Auth logic)
    └── server.js                    # Server entry point
```

---

## 🗄 Database Schema

RepoLens utilizes a highly normalized PostgreSQL schema mapped through Prisma.

- **`User`**: Tracks authentication details (Google/GitHub IDs, hashed passwords).
- **`Repository`**: Stores linked GitHub repositories.
- **`RepositoryScan`**: Tracks the asynchronous background scan status and timestamps (`startedAt`, `completedAt`).
- **`RepositoryFile` & `FileMetrics`**: Stores AST-parsed metrics (Lines of Code, Depth) per file.
- **`SecurityFinding`**: Tracks discovered vulnerabilities (XSS, Hardcoded Secrets).
- **`DependencyGraph`**: Stores the serialized Node/Edge JSON graph.
- **`HealthScore`**: Stores the calculated 0-100 scores for overall health, security, and maintainability.

---

## 📡 API Reference

All routes are prefixed with the base URL (default: `http://localhost:3000`).

### 🔐 Auth (`/auth`)
- `POST /auth/register` - Register with email/password.
- `POST /auth/login` - Login with email/password.
- `GET /auth/github/callback` - Handles the OAuth redirect.

### 🔬 Scans (`/analysis`)
- `POST /analysis/run` - Triggers a V2 background scan.
- `GET /analysis/dashboard-stats` - Aggregated metrics for the home dashboard.
- `GET /analysis/search` - Global text search across repos, files, and findings.
- `GET /analysis/compare` - Compare two scan IDs side-by-side.
- `POST /analysis/ask` - Chat with the AI assistant based on scan context.
- `GET /analysis/:id` - Returns the massive JSON payload for the V15Dashboard.

---

## 🔐 Authentication & Session Management

RepoLens uses a **dual-token JWT** system delivered securely via `httpOnly` cookies, paired with an Axios interceptor for silent token rotation.

**Security Measures:**
1. **`httpOnly` cookies**: Prevents malicious JavaScript (XSS) from reading the tokens.
2. **`sameSite: lax`**: Mitigates Cross-Site Request Forgery (CSRF).
3. **Silent Refresh**: The frontend automatically intercepts `401 Unauthorized` responses, calls `/auth/refresh`, and replays the failed request seamlessly.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** database
- **GitHub OAuth App**
- **OpenRouter API Key**

### 1. Clone & Install
```bash
git clone https://github.com/your-username/RepoLens.git
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
  <p><i>Built with ♥ using React, Express, Prisma, and OpenRouter AI</i></p>
</div>
