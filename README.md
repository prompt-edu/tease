# TEASE

**T**eam **A**llocation D**e**cision **S**upport Syst**e**m — An intelligent decision-support tool for software engineering team allocation in multi-project courses, as used in the iPraktikum at TUM.

[![Build and Deploy to Dev](https://github.com/prompt-edu/tease/actions/workflows/deploy-dev.yml/badge.svg)](https://github.com/prompt-edu/tease/actions/workflows/deploy-dev.yml)

---

## Overview

TEASE helps educators efficiently allocate students to project teams while considering multiple constraints such as skills, preferences, team diversity, and project requirements. The system uses constraint-based LP optimization to ensure fair and balanced team compositions.

### Key Features

- **Constraint-Based Allocation**: Define constraints for team size, skills, gender, nationality, language, and intro course proficiency
- **Preference Matching**: LP solver runs entirely in the browser — assigns students to preferred projects while meeting all constraints
- **Rich Student Cards**: Gravatar avatar, nationality flag, device icons, language proficiency, preference tiles, and proficiency dots — all at a glance
- **Student Detail Sheet**: Click any student card to open a full detail panel showing skills, preferences, devices, languages, and comments
- **Statistics Dialog**: 7 metrics (gender, intro course, skills, devices, study program, degree, project priority) visualized with doughnut + per-project bar charts
- **Data Menu**: Import from PROMPT, export allocations (to PROMPT or CSV), load demo data, or reset allocations — all behind one button with confirmation for destructive actions
- **Real-time Collaboration**: Multiple users can work simultaneously with live synchronization via bidirectional gRPC streaming
- **Lock Mechanism**: Manually lock specific student allocations that should not change; locks are broadcast to all collaborators
- **Module Federation**: Exposed as a Vite Module Federation remote — can be embedded in the PROMPT shell without an iframe

![Dashboard](docs/Dashboard.jpeg)

---

## Architecture

TEASE uses a React frontend and a Go backend, communicating via [Connect RPC](https://connectrpc.com) (a gRPC-compatible protocol that works over plain HTTP/2 and HTTP/1.1).

```
┌─────────────────────────────────────────────────────────┐
│                       Browser                            │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React + Vite (Module Federation remote)         │   │
│  │                                                  │   │
│  │  Zustand stores ─── LP solver (in-browser)       │   │
│  │  dnd-kit drag & drop                             │   │
│  │  Connect-Web ──────► bidirectional gRPC stream   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP/2 (h2c)
                ┌────────────▼────────────┐
                │  Go + Connect RPC       │
                │                        │
                │  In-memory room state  │
                │  OCC versioning        │
                │  Fan-out broadcaster   │
                └────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript + Vite |
| UI components | shadcn/ui (Radix UI + Tailwind CSS) |
| State management | Zustand 5 with `persist` middleware |
| Drag & drop | dnd-kit |
| LP solver | `javascript-lp-solver` (runs in browser) |
| RPC client | `@connectrpc/connect-web` v1 + `@bufbuild/protobuf` v1 |
| Module Federation | `@originjs/vite-plugin-federation` |
| Charts | Recharts |
| Backend framework | Go 1.24 + `connectrpc.com/connect` v1 |
| HTTP/2 | `golang.org/x/net/http2/h2c` (no TLS needed behind Traefik) |
| Proto toolchain | `buf` (schema linting), `protoc` + `protoc-gen-go` + `protoc-gen-connect-go` |
| Reverse proxy | Traefik v2 |

### Repository Layout

```
tease/
├── proto/                      # Protobuf contracts (source of truth)
│   ├── buf.yaml
│   ├── buf.gen.yaml
│   └── tease/v1/tease.proto
│
├── client-react/               # React frontend
│   ├── src/
│   │   ├── gen/               # Generated Connect/protobuf TS (do not edit)
│   │   ├── types/             # TypeScript interfaces (Student, Project, …)
│   │   ├── store/             # Zustand stores
│   │   ├── matching/          # LP solver + constraint system
│   │   ├── services/          # PromptService, CollaborationService, IdMappingService
│   │   ├── hooks/             # useCollaboration, useDragDrop
│   │   └── components/        # React components (Dashboard, ProjectCard, …)
│   ├── e2e/                   # Playwright end-to-end tests
│   ├── Dockerfile
│   └── package.json
│
├── server-go/                  # Go backend
│   ├── cmd/server/main.go     # Entrypoint
│   ├── pkg/
│   │   ├── gen/               # Generated Connect/protobuf Go (do not edit)
│   │   ├── core/state/        # IterationRoom + RoomStore (OCC versioning)
│   │   ├── core/sync/         # StreamManager + fan-out broadcaster
│   │   └── handler/           # TeamAllocationServiceHandler
│   └── Dockerfile
│
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/
    ├── test.yml               # Unit + E2E tests on every PR
    ├── build-and-push.yml     # Reusable: build + push Docker images
    ├── deploy-dev.yml
    └── deploy-prod.yml
```

---

## Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended for running the full stack)
- **OR** Node.js 22+, Go 1.24+, and `protoc` (for local development)

### Option A: Docker (recommended)

```bash
# Pull pre-built images and start
docker compose up

# Or build locally first
docker compose up --build
```

The app is available at **http://localhost/tease**.
The Go server listens on port **8081** (exposed only internally via Traefik).

### Option B: Local Development

**1. Start the Go server**

```bash
cd server-go
go run ./cmd/server
# Server starts on :8081
```

**2. Start the React dev server**

```bash
cd client-react
npm ci
npm run dev
# App available at http://localhost:5173
```

The Vite dev server proxies `/tease.v1.TeamAllocationService` → `http://localhost:8081`, so no CORS configuration is needed locally.

---

## Developer Guide

### Running Tests

**All tests (shortcut)**

```bash
make test    # React unit tests + Go unit tests
make e2e     # Playwright end-to-end tests
```

**Go (unit tests with race detector)**

```bash
cd server-go
go test ./... -race
```

**React (Vitest unit tests)**

```bash
cd client-react
npm test                 # single run
npm run test:watch       # watch mode
npm run test:coverage    # with coverage report
```

**End-to-end (Playwright)**

```bash
# Terminal 1: start Go server
cd server-go && go run ./cmd/server

# Terminal 2: run E2E tests (starts Vite automatically via playwright.config.ts)
cd client-react && npx playwright test
```

### Modifying the Proto Schema

The `.proto` file is the single source of truth for the RPC contract. After editing `proto/tease/v1/tease.proto`:

**Regenerate Go code**

```bash
# Requires: go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
#           go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
protoc \
  --proto_path=proto \
  --go_out=server-go/pkg/gen --go_opt=paths=source_relative \
  --connect-go_out=server-go/pkg/gen --connect-go_opt=paths=source_relative \
  tease/v1/tease.proto
```

**Regenerate TypeScript code**

```bash
# Requires: npm install -g @bufbuild/protoc-gen-es@1 @connectrpc/protoc-gen-connect-es@1
protoc \
  --proto_path=proto \
  --es_out=client-react/src/gen --es_opt=target=ts \
  --connect-es_out=client-react/src/gen --connect-es_opt=target=ts \
  tease/v1/tease.proto
```

> **Important:** The project uses the **v1 stack** — `@bufbuild/protobuf@1`, `@connectrpc/connect@1`, `protoc-gen-es@1`, `protoc-gen-connect-es@1`. Do not upgrade to v2 without regenerating all generated code.

### Architecture Notes

**Optimistic Concurrency Control (OCC)**

Every `MoveStudentRequest` carries the client's current `version`. The server increments a per-room version counter on each successful mutation and rejects requests where `expected_version != room.version`. This prevents lost-update anomalies when two users drag the same student simultaneously.

**Bidirectional streaming**

The browser opens a single long-lived `StreamUpdates` bidi stream per collaboration session. The client side uses a `MessageQueue<ClientUpdate>` async generator to push outgoing messages into the stream without blocking, while a separate `for await` loop consumes incoming `ServerUpdate` messages and applies them to Zustand stores.

**LP solver**

The `javascript-lp-solver` library runs entirely in the browser. The Go server's `SolveAllocation` RPC returns `NOT_IMPLEMENTED` — solving is intentionally client-side. The `ConstraintBuilder` assembles the LP model from constraint wrappers stored in `useConstraintStore`.

**Module Federation**

The build exposes `./Dashboard` at `remoteEntry.js`. When integrated into the PROMPT shell:
```javascript
// In PROMPT shell vite.config.ts
remotes: {
  tease: 'http://localhost/tease/assets/remoteEntry.js',
}
// Usage
const Dashboard = React.lazy(() => import('tease/Dashboard'))
```

### Project Conventions

- **Zustand stores** use the `persist` middleware with localStorage. Unit tests require the `LocalStorageMock` class defined in `src/test-setup.ts`.
- **shadcn/ui components** (e.g. `Card`) use `React.forwardRef` to support `setNodeRef` from dnd-kit.
- **TypeScript oneof fields** follow the `@bufbuild/protobuf` v1 discriminated-union convention: `{ update: { case: 'moveStudent', value: { ... } } }`.
- **Go oneof fields** use accessor methods: `msg.GetMoveStudent()`, `msg.GetLockStudent()`, etc.

---

## CI/CD Pipeline

### Workflow Overview

```
PR to main  ──► test.yml      (Go unit, React unit, Playwright E2E)
Push to main ──► deploy-dev.yml ──► build-and-push.yml ──► deploy to dev
Release      ──► deploy-prod.yml ──► build-and-push.yml ──► deploy to prod
```

### Workflows

| File | Trigger | Purpose |
|---|---|---|
| `test.yml` | PR to `main` | Run all tests (Go, React, E2E) |
| `build-and-push.yml` | Called by deploy workflows | Build + push `tease-client` and `tease-server` Docker images to GHCR |
| `deploy-dev.yml` | Push to `main` | Deploy to dev environment |
| `deploy-prod.yml` | Release published | Deploy to production |
| `pr-opened.yml` | PR opened | Auto-assign PR to author |

Docker images are published to:
- `ghcr.io/prompt-edu/tease-client`
- `ghcr.io/prompt-edu/tease-server`

---

## Integration with PROMPT

TEASE integrates with [PROMPT](https://github.com/ls1intum/prompt) (Project Management and Organization Tool):

- **Authentication**: Reads a JWT from `localStorage` (set by the PROMPT shell) to authenticate PROMPT API calls
- **Data import**: `PromptService` fetches course iterations, students, projects, and skills from `${window.location.origin}/team-allocation/api`
- **Data export**: Pushes final allocations back to PROMPT via REST
- **Module Federation**: Can be mounted directly inside the PROMPT shell as a remote component — no iframe required

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.

**Made with ❤️ by the AET Team at Technical University of Munich**
