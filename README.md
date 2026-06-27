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
- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🏗 Architecture](#-architecture)
- [📁 Project Structure](#-project-structure)
- [🗄 Database Schema](#-database-schema)
- [📡 API Reference](#-api-reference)
- [🔐 Authentication](#-authentication)
- [🚀 Getting Started](#-getting-started)
- [🔑 Environment Variables](#-environment-variables)
- [🗺 Frontend Routes](#-frontend-routes)
- [🧠 AI Analysis Pipeline](#-ai-analysis-pipeline)
- [🛡 Security Model](#-security-model)

---

## 🌐 Overview

> **RepoLens V1.5** is a full-stack AI code analysis platform designed as a complete **Repository Intelligence Engine**. 

It connects directly to your GitHub account, scans your entire repository tree, and runs a comprehensive pipeline of static analysis, dependency mapping, and AI-powered intelligence. It surfaces structural insights, security vulnerabilities, complexity metrics, and automatically generates onboarding guides and architecture documentation—all from a clean, terminal-aesthetic dark UI.

> ⚠️ **Note on Language Support:** Currently, the deterministic static analysis and dependency graphing engines are heavily optimized for **JavaScript and TypeScript (JS/TS)**. Support for Python, Go, Rust, Java, and other languages is actively in development!

### Supported Workflows:

| Workflow | Description |
|:---|:---|
| 🔍 **Repository Intelligence Scan** | Scans an entire GitHub repo recursively. Builds a dependency graph (DAG), calculates complexity metrics (dead code, large files), flags security vulnerabilities, and uses AI to generate an architecture summary. |
| 🔬 **Code Explorer** | Pick a single file (from a repo or manual upload) and get a deep line-by-line breakdown — notable lines, security flags, and structured improvement suggestions. |
| 📚 **Docs Generator** | Synthesize file-level purpose and architecture summaries into a cohesive technical documentation markdown document. |

---

## ✨ Features

### 🚀 Repository Intelligence Engine (V1.5)
- **Full Repository Scanning** — Recursively fetches the entire repository tree instead of relying on manual file selection.
- **Dependency Graph (DAG)** — Parses ES6 imports/requires to visually map the architecture of the codebase using `dagre` and `ReactFlow`.
- **Complexity Metrics** — Calculates deterministic metrics across the repo: Dead code indicators, large file counts (>300 lines), component/hook usage, and maximum nesting depths.
- **Security Vulnerability Scanner** — Analyzes the codebase for critical/high/medium/low severity vulnerabilities and provides specific **Recommendations** on how to fix them.
- **AI-Powered Architecture & Onboarding** — Leverages the full repo context to generate accurate architectural summaries and step-by-step onboarding guides.
- **4-Pillar Health Score** — Grades the repository on Overall Health, Maintainability, Security, and Architecture (0–100).

### 🔍 Code Explorer
- **Line-by-line Analysis** — Highlights only notable lines (max 60).
- **Multi-sentence Explanations** — Mechanical meaning + broader context + edge cases.
- **Improvement Cards** — `what` the problem is + `howToFix` with a code example + `codeQuote`.
- **Security Report** — Overall risk level + per-vulnerability analysis.
- **Purpose & Architecture** — Deep description of the file's role and design patterns.

### 🔐 Authentication
- **Email + Password** — bcrypt hashing, tight validation logic.
- **Google OAuth** — ID token verification via `google-auth-library`.
- **GitHub OAuth** — Full OAuth 2.0 flow for deep repository access.
- **JWT Session** — Dual-token system (access + refresh) stored as `httpOnly` cookies.

### 🎨 UI & UX
- Dark terminal-aesthetic design with clean monospace fonts.
- GSAP animations on the landing page for fluid transitions.
- Real-time file browser for navigating GitHub repos.

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
| **TailwindCSS 4** | Utility-first, high-performance styling |
| **React Router DOM 7** | Client-side routing and navigation |
| **GSAP 3** | Advanced animation library |

---

## 🏗 Architecture

```mermaid
graph TD
    subgraph Client [React 19 + Vite]
        A[AuthProvider] --> B[ProtectedRoute]
        B --> C[Pages: Dashboard, CodeExplorer, etc.]
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
        M[GPT-4o Mini API]
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
│   │   ├── context/AuthContext.jsx  # Global auth state
│   │   ├── services/api.js          # Axios interceptors
│   │   ├── pages/                   # Home, Dashboard, Explorer pages
│   │   └── ...
│
└── server/                          # Express backend (Node.js ESM)
    ├── prisma/                      # Database schema & migrations
    ├── src/
    │   ├── routes/                  # API route definitions
    │   ├── controllers/             # Business logic handlers
    │   ├── middleware/              # JWT and Google Token verifiers
    │   ├── services/                # Heavy AI and GitHub processing
    │   └── utils/                   # Helpers (Prisma singleton, Auth logic)
    └── server.js                    # Server entry point
```

---

## 🗄 Database Schema

RepoLens utilizes a highly normalized PostgreSQL schema mapped through Prisma.

- **`User`**: Tracks authentication details (Google/GitHub IDs, hashed passwords).
- **`Repository`**: Stores linked GitHub repositories.
- **`RepositoryScan`**: Tracks the asynchronous background scan status (`SCANNING`, `COMPLETED`).
- **`RepositoryFile` & `FileMetrics`**: Stores the AST-parsed metrics (Lines of Code, Depth) per file.
- **`SecurityFinding`**: Tracks discovered vulnerabilities (XSS, Hardcoded Secrets).
- **`DependencyGraph`**: Stores the serialized Node/Edge JSON graph.
- **`HealthScore`**: Stores the calculated 0-100 scores.
- **`FileDocumentation`**: Caches AI-generated explanations to save LLM costs.

---

## 📡 API Reference

All routes are prefixed with the base URL (default: `http://localhost:3000`).

### 🔐 Auth (`/auth`)
- `POST /auth/register` (Public) - Register with email/password.
- `POST /auth/login` (Public) - Login with email/password.
- `GET /auth/github/callback` (Public) - Handles the OAuth redirect.
- `GET /auth/me` (Protected) - Get current user profile.

### 🗂 Repositories (`/repos`)
- `GET /repos` (Protected) - Fetch all connected repos.
- `GET /repos/:owner/:repo/files` (Protected) - Get the GitHub file tree.

### 🔬 Scans (`/scan`)
- `POST /scan/start` (Protected) - Triggers a V1.5 background scan.
- `GET /scan/:id/status` (Protected) - Polls the current running state.
- `GET /scan/:id` (Protected) - Returns the final, massive JSON payload for the dashboard.

---

## 🔐 Authentication & Session Management

RepoLens uses a **dual-token JWT** system delivered securely via `httpOnly` cookies, paired with an Axios interceptor for silent token rotation.

**Security Measures:**
1. **`httpOnly` cookies**: Prevents malicious JavaScript (XSS) from reading the tokens.
2. **`sameSite: lax`**: Mitigates Cross-Site Request Forgery (CSRF).
3. **Silent Refresh**: The frontend automatically intercepts `401 Unauthorized` responses, calls `/auth/refresh`, and replays the failed request seamlessly.
4. **GitHub Token Reconnect**: If a user revokes GitHub access, the backend returns a specific `403 GITHUB_TOKEN_EXPIRED`, prompting the UI to show a "Reconnect" button.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** database
- **GitHub OAuth App**
- **Google OAuth Client**
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
npx prisma migrate dev
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
