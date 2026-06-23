# RepoLens

RepoLens is a web app that connects to your GitHub account and uses an AI model (GPT-4o-mini via OpenRouter) to analyze your code. You pick files from any of your repositories, the AI reads them, and you get back a structured report covering code quality, security risks, bugs, and more.

It also builds a file-by-file knowledge base in the background. Every file you analyze gets its purpose and architecture stored. Over time, this knowledge base can be turned into auto-generated technical documentation for the entire repository.

Built as a personal project to learn full-stack development with real authentication flows, relational database design, and AI API integration.

---

## What the Analysis Actually Does

This is the core feature of the app. Here is exactly what happens when you run an analysis.

### How it works

1. You select one or more files from a repository in the file tree
2. The server fetches the raw file content from GitHub using your OAuth token
3. The file content is sent to GPT-4o-mini (via OpenRouter) with line numbers attached so the AI can reference specific lines
4. The AI returns a structured JSON response — no prose, just data
5. The response is saved to the database and displayed in the report

### What the report contains

#### 1. Overall Health Score (0–100)
A single number representing the overall quality of the analyzed files. Colored green above 80, yellow above 60, and red below 60.

#### 2. Maintainability Score (0–100)
A separate score specifically for how easy the code is to maintain, read, and extend in the future. Shown as a second ring chart next to the health score.

#### 3. AI Summary
A 2–3 sentence plain English overview of the codebase health. Shown at the top of the report before the detailed findings.

#### 4. Findings — Individual Issues
Each finding is a specific problem identified in the code. Every finding contains:

| Field | What it means |
|-------|--------------|
| **Category** | One of: MAINTAINABILITY, SECURITY, RELIABILITY, PERFORMANCE, BUG, BEST_PRACTICE, STRUCTURE |
| **Severity** | One of: critical, high, medium, low |
| **Issue** | Short title of the problem |
| **Reason** | Detailed explanation of why this is a problem |
| **Suggestion** | Concrete recommendation for how to fix it, with code examples where possible |
| **File Path** | Which file the issue was found in |
| **Line Number** | The exact line number where the issue occurs |
| **Code Snippet** | The actual line(s) of code that have the problem |

You can filter findings by severity (critical / high / medium / low) using the sidebar on the findings page.

#### 5. Good Practices Observed
A list of things the code does well. Each entry has a title and a description of where and how that practice is applied. These are shown in the "Code Insights" tab after analysis.

#### 6. Structure Issues
Architectural problems in the code — things like tight coupling, poor separation of concerns, or bad file organization. Each structure issue has:
- A title
- A description of what is wrong
- A recommendation for how to restructure it

#### 7. Top Improvement Priorities
An ordered list of up to 5 things to fix first, ranked by importance. Shown at the top of the Code Insights tab.

#### 8. File Summaries (stored silently)
For every file analyzed, the AI also writes a short summary of:
- **Purpose** — what the file does
- **Architecture** — what patterns or roles the file plays in the codebase

These are saved to the database automatically. You do not see these directly in the analysis report, but they are used later to generate repository documentation.

---

## Code Explorer (File-Level Deep Dive)

Separate from the bulk analysis, there is a Code Explorer mode. You open a single file and the AI gives you a line-by-line breakdown of the notable parts.

### What the Code Explorer returns

#### Notable Lines
The AI picks the most interesting lines in the file — ones that are complex, have issues, or are worth explaining. For each notable line:
- The exact line number and code
- An explanation of what the line does and why it matters
- An improvement suggestion (if applicable)
- A security flag (if applicable)

The AI is instructed to skip blank lines, simple imports, and trivial closing braces — it only includes lines that are actually worth reading.

#### File-Level Improvements
Up to 6 high-level improvement suggestions for the entire file.

#### Security Report
A dedicated security breakdown per file:
- **Overall Risk Level** — one of: LOW, MEDIUM, HIGH, CRITICAL
- **Summary** — plain English overview of the security posture
- **Vulnerabilities** — each vulnerability has a title, severity, the line numbers involved, a detailed description, and a recommendation for how to fix it

The file-level summary (purpose + architecture) is also saved to the database automatically when you explore a file, same as bulk analysis.

---

## Repository Documentation

Once you have analyzed several files from a repository, you can generate documentation for the whole project.

### How it works
1. The backend fetches all `FileDocumentation` records stored for that repository and your account
2. These are combined and sent to the AI as context
3. The AI writes a markdown document covering: project overview, architecture, and component structure
4. A note is included in the documentation that it is based only on the files scanned so far, not the entire repository

The documentation gets more accurate the more files you analyze from different parts of the project.

---

## Pages

| Page | What it does |
|------|-------------|
| `/` | Landing page |
| `/auth` | Sign in / Register |
| `/dashboard` | Stats overview, recent analyses, quick actions, getting started guide |
| `/repositories` | Lists all your GitHub repositories (public and private) |
| `/repositories/:owner/:repo` | Browse files, run analysis, view file explorer, generate documentation |
| `/analysis` | Full history of all analyses you have run |
| `/analysis/:id` | Detailed report for a single analysis — findings, scores, insights |
| `/explorer` | Manual code paste mode — analyze code without needing GitHub |
| `/settings` | User settings |

---

## Architecture

```
client/          → React + Vite (port 5173)
server/          → Node.js + Express (port 3000)
server/prisma/   → Database schema and migrations
```

### Request flow

```
Browser
  │
  ├── axios (withCredentials: true)
  │         sends httpOnly JWT cookie on every request
  │
  ▼
Express Server
  │
  ├── verifyToken middleware
  │         reads 'accessToken' cookie → verifies JWT → attaches user to req
  │
  ├── Router (user.route / repos.route / analysis.route)
  │
  ├── Controller (validates input, handles req/res)
  │
  ├── Service (github.service / analysis.service)
  │         ├── GitHub API — fetch file contents
  │         └── OpenRouter API — send prompt, parse JSON response
  │
  └── Prisma ORM → PostgreSQL
```

### Database models

```
User
  ├── has many Repository
  └── has many FileDocumentation

Repository
  └── has many Analysis

Analysis
  └── has many Finding

FileDocumentation
  - stores AI-generated purpose + architecture per file
  - unique constraint: one record per (userId + repoFullName + filePath)
  - populated automatically on every analysis or file explore
```

### Auth flow

Three ways to log in — all end up with the same JWT cookie session:

- **Email/Password** — password hashed with bcrypt, JWT issued on login
- **Google** — uses Google Identity Services, backend validates access token with Google's userinfo endpoint
- **GitHub** — OAuth redirect flow, backend exchanges authorization code for access token via GitHub API

JWT is stored as an `httpOnly` cookie (not localStorage). JavaScript in the browser cannot read it.

When you connect GitHub to an existing account, the backend looks up your GitHub ID in the database. If already linked, it refreshes the access token. If not linked but the same email exists, it links GitHub to that account. If neither, it creates a new account.

---

## Tech Stack

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 19 | UI framework |
| Vite | 8 | Build tool and dev server |
| React Router DOM | 7 | Client-side routing and protected routes |
| Tailwind CSS | 4 | Utility-first styling |
| GSAP | 3 | Animations and transitions |
| @react-oauth/google | 0.13 | Google Identity Services integration |
| Axios | 1 | HTTP client with cookie support |

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Express | 5 | Web server |
| Prisma | 6 | ORM for PostgreSQL |
| jsonwebtoken | 9 | JWT signing and verification |
| bcryptjs | 3 | Password hashing |
| octokit | 5 | GitHub REST API client |
| google-auth-library | 10 | Google token validation |
| cookie-parser | 1 | Parse cookies from incoming requests |
| cors | 2 | Allow cross-origin requests from the frontend |
| validator | 13 | Email format and password strength validation |
| nodemon | 3 | Auto-restart server during development |

### External Services
| Service | Purpose |
|---------|---------|
| GitHub API | Fetch repositories, file trees, and raw file content using the user's OAuth token |
| OpenRouter (GPT-4o-mini) | Run AI analysis and code exploration |
| Google OAuth | Authenticate users via Google account |

---

## Project Structure

```
RepoLens/
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Home.jsx
│       │   ├── Auth.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Repositories.jsx
│       │   ├── RepoExplorer.jsx      ← file browser, analysis trigger, docs
│       │   ├── AnalysisHistory.jsx
│       │   ├── FindingsPage.jsx      ← analysis report with all findings
│       │   ├── CodeExplorer.jsx      ← line-by-line file explorer
│       │   └── SettingsPage.jsx
│       ├── Components/
│       │   ├── common/               → Navbar, DashboardLayout, ProtectedRoute, LoadingSpinner
│       │   ├── landing/              → Hero, Features, Workflow, Footer sections
│       │   └── analysis/             → FindingCard, RiskScore, ManualAnalysisModal
│       ├── context/
│       │   └── AuthContext.jsx       → global user state, fetched from /auth/me on load
│       └── services/
│           └── api.js                → axios instance, base URL, cookie config, 401 handler
│
└── server/
    ├── server.js                     → entry point, middleware, route mounting
    ├── prisma/
    │   └── schema.prisma             → all database models
    └── src/
        ├── routes/                   → user.route, repos.route, analysis.route
        ├── controllers/              → user, repos, analysis controllers
        ├── services/
        │   ├── analysis.service.js   → AI prompt construction and response parsing
        │   ├── github.service.js     → GitHub API calls (repos, file tree, file content)
        │   └── auth.service.js       → JWT generation and cookie setting
        ├── middleware/
        │   ├── verifyJWT.middleware.js    → reads accessToken cookie, verifies JWT
        │   └── verifyGoogleToken.middleware.js
        └── utils/                    → prisma client, github util, google util, validators
```

---

## Setup

### Requirements

- Node.js v18 or higher
- PostgreSQL running locally or a hosted connection string
- A GitHub OAuth App (for repository access)
- A Google OAuth Client (for Google sign-in)
- An OpenRouter API key

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd RepoLens
```

### 2. Server environment variables

Create `server/.env`:

```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/repolens"

ACCESS_TOKEN_SECRET=a_long_random_string
REFRESH_TOKEN_SECRET=another_long_random_string
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d

NODE_ENV=development

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000

OPENROUTER_API_KEY=your_openrouter_key
```

### 3. Client environment variables

Create `client/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### 4. Set up the database

```bash
cd server
npm install
npx prisma db push
```

### 5. Run the server

```bash
cd server
npm run dev
```

### 6. Run the client

```bash
cd client
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## Setting up OAuth

### GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set the **Authorization callback URL** to `http://localhost:3000/auth/github/callback`
4. Copy Client ID and Client Secret to `server/.env`

The app requests the `repo` and `user:email` scopes. `repo` scope is needed to access private repositories.

### Google OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create an OAuth 2.0 Client ID (Web application type)
3. Add `http://localhost:5173` as an **Authorized JavaScript origin**
4. Copy Client ID to `client/.env` and `server/.env`

---

## What the AI model receives

For context, here is what gets sent to GPT-4o-mini for a bulk analysis:

- All selected file contents, with line numbers prepended to each line
- An instruction to return a specific JSON schema (no markdown, no prose)
- Focus areas: maintainability, security, performance, best practices, and structure

The model is `openai/gpt-4o-mini` by default. You can override this by setting `OPENROUTER_MODEL` in `server/.env`.

---

## Known Limitations

- AI analysis runs synchronously inside the HTTP request. For large files or multiple files, this can take 10–30 seconds. In production you would move this to a background job queue (e.g. BullMQ + Redis).
- No rate limiting on AI endpoints. Running many analyses in a short time will consume OpenRouter credits quickly.
- GitHub access tokens are stored as plain text in the database. Encrypting them at rest would be a meaningful security improvement.
- The `isEmailVerified` field exists in the database schema but email verification is not implemented.
- No automated tests exist for either the frontend or backend.
- The documentation generated for a repository is only as good as the number and variety of files you have scanned. Scanning files from different folders gives better results.

---

## What I learned building this

- How OAuth 2.0 works in practice — token exchange, linking multiple providers to one account, callback handling
- How to design a normalized relational schema that connects users to their data securely
- How to get structured JSON output from an LLM using prompt engineering instead of parsing prose
- Why `httpOnly` cookies are safer than `localStorage` for JWTs (JavaScript cannot read them)
- The difference between authentication and authorization — discovered an IDOR vulnerability during development where any user could read any other user's analysis report by guessing an ID
- How to debug cross-origin cookie issues between a Vite dev server and an Express API
