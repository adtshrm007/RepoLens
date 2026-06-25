<div align="center">

# 🔭 RepoLens

**AI-powered code intelligence platform — analyze, explore, and document any codebase in seconds.**

[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?logo=node.js&logoColor=white)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-AI%20Backend-FF6B6B)](https://openrouter.ai/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Authentication](#-authentication)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Frontend Routes](#-frontend-routes)
- [AI Analysis Pipeline](#-ai-analysis-pipeline)
- [Security Model](#-security-model)

---

## 🌐 Overview

**RepoLens V1.5** is a full-stack AI code analysis platform designed as a complete **Repository Intelligence Engine**. It connects directly to your GitHub account, scans your entire repository tree, and runs a comprehensive pipeline of static analysis, dependency mapping, and AI-powered intelligence. It surfaces structural insights, security vulnerabilities, complexity metrics, and automatically generates onboarding guides and architecture documentation—all from a clean, terminal-aesthetic dark UI.

The platform supports three distinct workflows:

| Workflow | Description |
|---|---|
| **Repository Intelligence Scan (V1.5)** | Scans an entire GitHub repo recursively. Builds a dependency graph (DAG), calculates complexity metrics (dead code, large files), flags security vulnerabilities with actionable recommendations, and uses AI to generate an architecture summary and onboarding guide. |
| **Code Explorer** | Pick a single file (from a repo or by pasting/uploading) and get a deep line-by-line breakdown — notable lines, security flags, and structured improvement suggestions with code quotes |
| **Docs Generator** | Synthesize file-level purpose and architecture summaries into a cohesive technical documentation markdown document |

---

## ✨ Features

### Repository Intelligence Engine (V1.5)
- **Full Repository Scanning** — Recursively fetches the entire repository tree instead of relying on manual file selection.
- **Dependency Graph (DAG)** — Parses ES6 imports/requires to visually map the architecture of the codebase using `dagre` and `ReactFlow`.
- **Complexity Metrics** — Calculates deterministic metrics across the repo: Dead code indicators, large file counts (>300 lines), component/hook usage, and maximum nesting depths.
- **Security Vulnerability Scanner** — Analyzes the codebase for critical/high/medium/low severity vulnerabilities and provides specific **Recommendations** on how to fix them.
- **AI-Powered Architecture & Onboarding** — Leverages the full repo context (including the dependency graph) to generate accurate architectural summaries and step-by-step onboarding guides.
- **4-Pillar Health Score** — Grades the repository on Overall Health, Maintainability, Security, and Architecture (0–100).

### Code Explorer
- **Line-by-line Analysis** — only notable lines flagged (max 60), not every trivial line
- **Multi-sentence Explanations** — mechanical meaning + broader context + edge cases
- **Improvement Cards** — `what` the problem is + `howToFix` with code example + `codeQuote` from the file
- **Security Report** — overall risk level (`LOW/MEDIUM/HIGH/CRITICAL`) + per-vulnerability analysis with fix recommendations
- **Purpose & Architecture** — deep, multi-sentence description of the file's role and design patterns

### Authentication
- **Email + Password** — bcrypt hashing, validation (email format, password strength, name length)
- **Google OAuth** — ID token verification via `google-auth-library`, account linking for existing emails
- **GitHub OAuth** — Full OAuth 2.0 flow, `repo` + `user:email` scopes, GitHub access token persisted for API calls
- **Account Linking** — signing in with a social provider automatically links to an existing email account
- **JWT Session** — dual-token system (access + refresh) stored as `httpOnly` cookies, 7-day expiry

### UI & UX
- Dark terminal-aesthetic design with monospace fonts
- GSAP animations on the landing page
- Responsive layout with sidebar navigation
- Tab-based result views: Overview · Notable Lines · Security
- Real-time file browser for navigating GitHub repos (lazy-loads directory contents)
- Drag-and-drop / click-to-upload file support for manual analysis

---

## 🛠 Tech Stack

### Backend (`/server`)

| Technology | Role |
|---|---|
| **Express 5** | HTTP server framework |
| **Prisma 6** | Type-safe ORM + migrations |
| **PostgreSQL** | Relational database |
| **Octokit** | GitHub REST API client |
| **JSON Web Token** | Stateless session management |
| **bcryptjs** | Password hashing |
| **google-auth-library** | Google ID token verification |
| **axios** | HTTP client for OpenRouter AI calls |
| **cookie-parser** | `httpOnly` cookie handling |
| **dotenv** | Environment variable loading |
| **nodemon** | Development auto-restart |
| **validator** | Email / input validation utilities |

### Frontend (`/client`)

| Technology | Role |
|---|---|
| **React 19** | UI component library |
| **Vite 8** | Build tool and dev server |
| **React Router DOM 7** | Client-side routing |
| **axios** | API communication |
| **GSAP 3 + @gsap/react** | Landing page animations |
| **@react-oauth/google** | Google OAuth button |
| **TailwindCSS 4** | Utility-first styling |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT (React 19 + Vite)                     │
│                                                                         │
│  AuthProvider (Context) ─── ProtectedRoute (HOC)                        │
│        │                                                                │
│  Pages: Home · Auth · Dashboard · Repositories · RepoExplorer          │
│          CodeExplorer · AnalysisHistory · FindingsPage · Settings       │
│        │                                                                │
│  api.js (Axios instance + 401 interceptor → /auth redirect)             │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │  HTTP + httpOnly cookie JWTs
                            │
┌───────────────────────────▼─────────────────────────────────────────────┐
│                         SERVER (Express 5 + Node.js)                    │
│                                                                         │
│  server.js                                                              │
│   ├── /auth    → user.route.js  → user.controller.js                   │
│   ├── /repos   → repos.route.js → repos.controller.js                  │
│   └── /analysis→ analysis.route.js → analysis.controller.js            │
│                                                                         │
│  Middleware:                                                            │
│   └── verifyJWT → strips sensitive fields, attaches req.user           │
│                                                                         │
│  Services:                                                              │
│   ├── auth.service.js      → JWT generation + cookie setting           │
│   ├── github.service.js    → Octokit wrapper (repos, files, content)   │
│   └── analysis.service.js  → OpenRouter AI calls + JSON validation     │
│                                                                         │
│  Utils:                                                                 │
│   ├── prisma.util.js       → Singleton Prisma Client                   │
│   ├── auth.utils.js        → Email/password/name validators            │
│   ├── github.util.js       → GitHub OAuth token exchange               │
│   └── google.util.js       → Google token verification                 │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │
           ┌────────────────┴─────────────────┐
           │                                  │
┌──────────▼──────────┐          ┌────────────▼────────────┐
│   PostgreSQL (via   │          │  OpenRouter AI API       │
│   Prisma ORM)       │          │  (GPT-4o Mini default)   │
│                     │          │                          │
│  User               │          │  - runAIAnalysis()       │
│  Repository         │          │  - runCodeExplorer()     │
│  Analysis           │          │  - generateRepoDocs()    │
│  Finding            │          │                          │
│  FileDocumentation  │          └──────────────────────────┘
└─────────────────────┘
```

---

## 📁 Project Structure

```
RepoLens/
├── client/                          # React frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                  # Root router — all page routes declared here
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # Global auth state + useAuth() hook
│   │   ├── services/
│   │   │   └── api.js               # Axios instance with base URL + 401 interceptor
│   │   ├── hooks/
│   │   │   └── useAuth.js           # Thin re-export of useAuth from context
│   │   ├── pages/
│   │   │   ├── Home.jsx             # Public landing page
│   │   │   ├── Auth.jsx             # Login + Registration + OAuth buttons
│   │   │   ├── Repositories.jsx     # List of connected GitHub repositories
│   │   │   ├── RepoExplorer.jsx     # Browse repo files + trigger bulk analysis
│   │   │   ├── CodeExplorer.jsx     # Single-file deep analysis + security report
│   │   │   ├── AnalysisHistory.jsx  # Paginated list of past analyses
│   │   │   ├── FindingsPage.jsx     # Detailed view of one analysis run
│   │   │   └── SettingsPage.jsx     # User profile and account settings
│   │   └── ...
│
└── server/                          # Express backend (Node.js ESM)
    ├── server.js                    # Entry point
    ├── prisma/
    │   ├── schema.prisma            # Database schema
    │   └── migrations/              
    ├── src/
    │   ├── routes/
    │   │   ├── user.route.js        # /auth/* — registration, login, OAuth, session
    │   │   ├── repos.route.js       # /repos/* — GitHub repo and file browsing
    │   │   └── analysis.route.js    # /analysis/* — all analysis endpoints
    │   ├── controllers/
    │   │   ├── user.controller.js   # All auth logic (register, login, Google, GitHub)
    │   │   ├── repos.controller.js  # GitHub repo proxy (list, details, file tree)
    │   │   └── analysis.controller.js # Analysis CRUD + code explorer + doc gen
    │   ├── middleware/
    │   │   ├── verifyJWT.middleware.js          # JWT access token validation
    │   │   ├── auth.middleware.js               # General auth guard
    │   │   └── verifyGoogleToken.middleware.js  # Google ID token verification
    │   ├── services/
    │   │   ├── analysis.service.js  # AI prompt engine (OpenRouter calls + validation)
    │   │   ├── auth.service.js      # JWT generation + httpOnly cookie setup
    │   │   └── github.service.js    # Octokit wrappers for GitHub API
    │   └── utils/
    │       ├── prisma.util.js       # Singleton PrismaClient export
    │       ├── auth.utils.js        # isValidEmail, isStrongPassword, isValidName
    │       ├── github.util.js       # GitHub OAuth code → access token exchange
    │       └── google.util.js       # Google token verification helper
    └── package.json
```

---

## 🗄 Database Schema

All data is stored in PostgreSQL via Prisma. Five models are defined:

### `User`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `name` | `String` | Display name |
| `email` | `String` | Unique |
| `username` | `String?` | GitHub username |
| `password` | `String?` | Null for OAuth-only accounts |
| `provider` | `AuthProvider` | `CUSTOM`, `GOOGLE`, or `GITHUB` |
| `profilePic` | `String?` | Avatar URL |
| `githubId` | `String?` | Unique GitHub user ID |
| `googleId` | `String?` | Unique Google sub ID |
| `githubAccessToken` | `String?` | Stored for GitHub API calls |
| `appRefreshToken` | `String?` | App-issued refresh token |
| `isEmailVerified` | `Boolean` | Default `false` |

### `Repository`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `name` | `String` | Repo name |
| `fullName` | `String` | `owner/repo` format |
| `githubRepoId` | `String` | GitHub's repo identifier |
| `repoUrl` | `String` | GitHub URL |
| `isPrivate` | `Boolean` | Access level |
| `userId` | `String` | FK → `User` |

### `RepositoryScan` (Replaces `Analysis`)
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `repositoryId` | `String` | FK → `Repository` |
| `status` | `String` | `"SCANNING"`, `"ANALYZING"`, `"COMPLETED"` |
| `totalFiles` | `Int` | Total files in repo |
| `analyzedFiles` | `Int` | Files successfully processed |
| `summary` | `String?` | Short summary text |

### `RepositoryFile` & `FileMetrics`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `scanId` | `String` | FK → `RepositoryScan` |
| `path` | `String` | e.g. `src/App.jsx` |
| `linesOfCode` | `Int` | Stored in `FileMetrics` |
| `deadCodeIndicators` | `Int` | Stored in `FileMetrics` |
| `dependencyCount` | `Int` | Stored in `FileMetrics` |

### `SecurityFinding`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `scanId` | `String` | FK → `RepositoryScan` |
| `type` | `String` | e.g. `"XSS Vulnerability"` |
| `severity` | `String` | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` |
| `file` | `String` | File path |
| `snippet` | `String` | Verbatim code from the file |
| `description` | `String` | Detailed explanation |
| `recommendation` | `String?` | Step-by-step fix in Markdown |

### `DependencyGraph`, `HealthScore`, `ArchitectureModel`, `OnboardingGuide`
These models store the modular outputs generated by the V1.5 `ScannerService` engine. They are tied 1-to-1 with a `RepositoryScan`.

### `FileDocumentation`
| Field | Type | Notes |
|---|---|---|
| `id` | `String` (cuid) | Primary key |
| `repoFullName` | `String` | e.g. `"owner/repo"` |
| `filePath` | `String` | Path within the repo |
| `purpose` | `String?` | AI-generated purpose description |
| `architecture` | `String?` | AI-generated architecture description |
| `userId` | `String` | FK → `User` |
| Unique | `(userId, repoFullName, filePath)` | Prevents duplicates; enables upsert |

---

## 📡 API Reference

All routes are prefixed with the base URL (default: `http://localhost:3000`).

### Auth — `/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Register with email + password |
| `POST` | `/auth/login` | Public | Login with email + password |
| `POST` | `/auth/google` | Public | Google OAuth (send access token in body) |
| `GET` | `/auth/github` | Public | Redirect to GitHub OAuth consent screen |
| `GET` | `/auth/github/callback` | Public | GitHub OAuth callback — sets cookies + redirects to dashboard |
| `GET` | `/auth/me` | 🔒 JWT | Return current user (sensitive fields stripped) |
| `POST` | `/auth/logout` | Public | Clear `accessToken` + `refreshToken` cookies |

### Repositories — `/repos`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/repos` | 🔒 JWT | Fetch all repos for the authenticated GitHub user |
| `GET` | `/repos/:owner/:repo` | 🔒 JWT | Get details for a specific repository |
| `GET` | `/repos/:owner/:repo/files` | 🔒 JWT | Get file/folder tree (pass `?path=` for subdirectory) |

### Scans — `/scan`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/scan/start` | 🔒 JWT | Triggers a full V1.5 Repository Scan |
| `GET` | `/scan/:id` | 🔒 JWT | Fetches the fully aggregated payload for the V1.5 Dashboard |
| `GET` | `/scan/:id/status` | 🔒 JWT | Polls the current state of a running scan |

#### `POST /scan/start` — Request Body
```json
{
  "owner": "github-username",
  "repoName": "my-repo"
}
```

#### `GET /scan/:id` — Response
```json
{
  "scan": {
    "id": "cuid",
    "status": "COMPLETED",
    "analyzedFiles": 120
  },
  "metrics": {
    "totalLines": 14500,
    "functionCount": 320,
    "deadCodeIndicators": 3,
    "largeFilesCount": 2
  },
  "healthScore": {
    "overall": 92,
    "maintainability": 85,
    "security": 100,
    "architecture": 88
  },
  "dependencyGraph": { "nodes": [...], "edges": [...] },
  "securityFindings": [ { "type": "XSS", "severity": "HIGH", "recommendation": "..." } ],
  "architecture": { "summary": "..." },
  "onboardingGuide": { "content": "..." }
}
```

#### `POST /analysis/explore` / `POST /analysis/explore-repo` — Response
```json
{
  "explanation": {
    "purpose": "3-5 sentence description...",
    "architecture": "3-5 sentences naming patterns...",
    "notableLines": [
      {
        "number": 42,
        "code": "const token = jwt.sign(...)",
        "explanation": "2-3 sentence explanation...",
        "improvement": "WHAT + HOW + WHY ...",
        "securityFlag": null
      }
    ],
    "improvements": [
      {
        "what": "The error handler does not...",
        "howToFix": "Wrap the async handler with...",
        "codeQuote": "app.use((err, req, res, next) => {"
      }
    ],
    "securityReport": {
      "overallRisk": "MEDIUM",
      "summary": "...",
      "vulnerabilities": [ ... ]
    }
  }
}
```

---

## 🔐 Authentication & Session Management

RepoLens uses a **dual-token JWT** system delivered securely via `httpOnly` cookies, paired with a robust Axios interceptor for silent token rotation.

### 1. Silent Refresh Token Rotation

```text
┌──────────────┐      POST /auth/login       ┌──────────────────┐
│   Browser    │ ──────────────────────────► │   Express Server │
│              │ ◄───── Set-Cookie ────────── │                  │
│ accessToken  │   httpOnly, Secure, SameSite │ Signs JWT:       │
│ refreshToken │   (7-day maxAge)             │ { id, email }    │
└──────────────┘                             └──────────────────┘
       │
       │  API Request (withCredentials: true)
       ▼
┌──────────────────────────────────────────┐
│  API returns 401 Unauthorized (Expired)  │
└──────────────────────────────────────────┘
       │
       │  Axios Interceptor Catches 401
       ▼
┌──────────────────────────────────────────┐
│  POST /auth/refresh (Sends RefreshToken) │
│  Server verifies against DB & issues new │
│  Access + Refresh tokens silently        │
└──────────────────────────────────────────┘
       │
       │  Interceptor Replays Request
       ▼
┌──────────────────────────────────────────┐
│  Original API request succeeds seamlessly│
└──────────────────────────────────────────┘
```

**Security measures:**
- `httpOnly` cookies prevent XSS from reading tokens.
- `sameSite: lax` mitigates CSRF.
- `secure: true` in production (HTTPS only).
- Sensitive fields (`password`, `githubAccessToken`, `appRefreshToken`) are stripped before attaching to `req.user`.
- Refresh tokens are explicitly stored in the database. When `/auth/refresh` is called, the server validates the incoming token against the database to prevent token reuse/hijacking.

### 2. GitHub Token Validation & Reconnect Flow

Instead of background polling, RepoLens uses **Implicit Validation** for GitHub Access Tokens:
1. The server passes the user's stored `githubAccessToken` to the `Octokit` SDK when making API requests.
2. If the user revokes access or the token expires, GitHub returns a `401 Bad Credentials` error.
3. The server catches this exact error, overriding the generic crash, and responds to the frontend with a specific `403` status and `code: "GITHUB_TOKEN_EXPIRED"`.
4. The React frontend intercepts this code and injects a **"Reconnect GitHub"** button directly into the error banner inside `Repositories.jsx`, `RepoExplorer.jsx`, and `CodeExplorer.jsx`.
5. Clicking the button initiates the OAuth flow again, securely replacing the dead token in the database without destroying the user's local session.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** database (local or hosted, e.g. Supabase, Neon, Railway)
- **GitHub OAuth App** — [Create one here](https://github.com/settings/applications/new)
- **Google OAuth Client** — [Create one here](https://console.cloud.google.com/)
- **OpenRouter account** — [Get API key here](https://openrouter.ai/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/RepoLens.git
cd RepoLens
```

---

### 2. Set Up the Server

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory (see [Environment Variables](#-environment-variables) below).

Run Prisma migrations to create the database schema:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the development server:

```bash
npm run dev
# Server runs at http://localhost:3000
```

---

### 3. Set Up the Client

```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

Start the development server:

```bash
npm run dev
# Client runs at http://localhost:5173
```

---

## 🔑 Environment Variables

### Server — `server/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/repolens`) |
| `PORT` | ❌ | Server port (default: `3000`) |
| `CLIENT_URL` | ✅ | Frontend URL for CORS and OAuth redirects (e.g. `http://localhost:5173`) |
| `ACCESS_TOKEN_SECRET` | ✅ | Secret key for signing JWT access tokens |
| `REFRESH_TOKEN_SECRET` | ✅ | Secret key for signing JWT refresh tokens |
| `ACCESS_TOKEN_EXPIRY` | ✅ | Access token TTL (e.g. `15m`) |
| `REFRESH_TOKEN_EXPIRY` | ✅ | Refresh token TTL (e.g. `7d`) |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App client secret |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `OPENROUTER_API_KEY` | ✅ | OpenRouter API key for AI calls |
| `OPENROUTER_MODEL` | ❌ | AI model to use (default: `openai/gpt-4o-mini`) |
| `NODE_ENV` | ❌ | `production` to enable secure cookies |

### Client — `client/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | ✅ | Backend base URL (e.g. `http://localhost:3000`) |
| `VITE_GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID (must match server's) |

> **Tip:** Generate strong secrets with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.

---

## 🗺 Frontend Routes

| Route | Component | Protected | Description |
|---|---|---|---|
| `/` | `Home` | No | Landing page |
| `/auth` | `Auth` | No | Login / registration / OAuth |
| `/dashboard` | `Dashboard` | Yes | Overview stats + recent activity |
| `/repositories` | `Repositories` | Yes | List of connected GitHub repos |
| `/repositories/:owner/:repo` | `RepoExplorer` | Yes | File browser + bulk analysis trigger |
| `/analysis` | `AnalysisHistory` | Yes | All past analysis runs |
| `/analysis/:id` | `FindingsPage` | Yes | Findings, insights, scores for one analysis |
| `/explorer` | `CodeExplorer` | Yes | Single-file deep exploration + security report |
| `/settings` | `SettingsPage` | Yes | Profile and account management |

All protected routes are wrapped in `ProtectedRoute`, which reads from `AuthContext`. If `user` is `null` and loading is complete, the user is redirected to `/auth`.

---

### `ScannerService` (V1.5 Repository Intelligence Pipeline)

```
User triggers /scan/start
      │
      ▼
Fetch default branch & repository tree from GitHub
      │
      ▼
Fetch contents for valid files (filters binaries/assets)
      │
      ▼
1. DependencyGraphService: AST parsing for imports/exports
2. StaticAnalysisService: Complexity metrics, lines, dead code
3. SecurityScannerService: Pattern-matching & vulnerability heuristics
      │
      ▼
ScoringEngineService: Aggregates data to calculate the 4-pillar Health Score
      │
      ▼
generateV1_5Insights() (AI): Ingests the dependency graph and metrics
to produce an Onboarding Guide and Architectural Summary
      │
      ▼
Saves all relational data to Prisma (FileMetrics, DependencyGraph, SecurityFinding, etc.)
      │
      ▼
Dashboard calls /scan/:id to retrieve the full payload
```

### `runCodeExplorer()` — Single-file Deep Dive

```
User provides file (from repo or manual paste)
      │
      ▼
Build numbered prompt for the single file
      │
      ▼
callOpenRouter() → JSON with purpose, architecture,
                   notableLines[], improvements[], securityReport
      │
      ▼
validateNotableLines() → drop lines citing invalid line numbers
validateVulnerabilities() → drop vulns where every cited line is invalid
      │
      ▼
Upsert FileDocumentation (purpose + architecture) to DB
      │
      ▼
Return to client: full structured explanation
```

### Accuracy Rules

The prompts include a strict `ACCURACY_RULES` block that instructs the model to:
- Only report findings with verbatim code quotes
- Never use hedge language (`may`, `might`, `could potentially`)
- Never flag `process.env` reads as security issues unless the value is actually logged or hardcoded
- Cite exact line numbers from the provided numbered source

---

## 🛡 Security Model

| Concern | Mitigation |
|---|---|
| **XSS token theft** | JWTs stored in `httpOnly` cookies, inaccessible to JavaScript |
| **CSRF** | `sameSite: lax` on cookies; no state-changing GET requests |
| **IDOR on analyses** | `getAnalysisById` filters by `repository.userId` — returns 404 for unauthorized IDs |
| **Sensitive field leakage** | `verifyJWT` and `getMe` strip `password`, `githubAccessToken`, `appRefreshToken` before any response |
| **Google token forgery** | Server verifies the ID token with `google-auth-library` before trusting any claims |
| **Password security** | bcrypt with 10 salt rounds; Google-only accounts explicitly blocked from password login |
| **AI hallucinated lines** | Line number validation drops any finding or notable line citing a non-existent line number |

---

## 📝 Scripts

### Server
```bash
npm run dev      # Start server with nodemon (auto-restart on change)
npx prisma studio  # Open Prisma database browser
npx prisma migrate dev  # Run migrations in development
npx prisma generate     # Regenerate Prisma client after schema changes
```

### Client
```bash
npm run dev      # Start Vite dev server (HMR)
npm run build    # Build for production (output: dist/)
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

Built with ♥ using React, Express, Prisma, and OpenRouter AI

</div>
