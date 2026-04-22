# TEASE Refactoring & Migration: Technical Handoff (TODO)

## 🎯 Objective
Refactor the **TEASE** (Team Allocation Decision Support System) from an Angular/Java monolith-relay into a modern, modular **React/Go** architecture. The goal is to provide team allocation logic as a pluggable module that integrates with the **PROMPT** ecosystem via Module Federation and gRPC, while maintaining a functional standalone version.

---

## 🏗️ Target Architecture

### **Frontend: React + shadcn/ui**
- **Framework:** Vite + React + TypeScript.
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI) for accessibility and modern look.
- **State Management:** **Zustand** (to replace complex RxJS streams).
- **Drag & Drop:** **`@dnd-kit`** (replacing the outdated `ng2-dragula`).
- **Communication:** **Connect RPC** (Protobuf over HTTP/1.1 or gRPC) for real-time sync.
- **Integration:** Vite Module Federation (`@originjs/vite-plugin-federation`) to expose TEASE as a remote module.

### **Backend: Go Modular Core**
- **Language:** Go (for performance and small binary size).
- **Communication:** **Connect/gRPC** for low-latency bidirectional streaming.
- **Storage:** Thread-safe In-memory state (protected by RWMutex) for active "Rooms" (Course Iterations).
- **Modularity:** Hexagonal architecture (Core logic in `pkg/core` is importable as a library by PROMPT).

---

## 🛠️ Technical Specifications & Edge Cases

### **1. Real-time Collaboration (Sync)**
- **Protocol:** Bidirectional gRPC/Connect Stream.
- **Delta Updates:** Instead of sending the full state (current Java behavior), use a "Delta" protocol:
  - `MoveStudentRequest { studentId, fromProjectId, toProjectId }`
- **Conflict Resolution (OCC):** Implement **Optimistic Concurrency Control**. Every `Allocation` has a `version`. The server rejects moves if the `expected_version` sent by the client is outdated.

### **2. Allocation Strategy Interface**
- Create an `AllocationStrategy` interface in React/Go to support multiple solvers.
- **Current Strategy:** Browser-based Linear Programming (LP) using `javascript-lp-solver`.
- **Future Strategies:** Server-side Genetic Algorithms, AI-based matching, or Manual overrides.

---

## 🚦 Current Status & Progress

### **Completed:**
- [x] Architecture & Migration Plan finalized (see `migration-plan.md`).
- [x] Protobuf contracts defined (`proto/tease/v1/tease.proto`) with versioning and Delta Update support.
- [x] Go backend module initialized (`server-go/`).
- [x] `buf` configuration created for code generation.

### **Immediate Next Steps (TODO):**

#### **1. Code Generation**
Run code generation for both Go and React using the existing `proto/buf.gen.yaml`:
```bash
buf generate
```

#### **2. Backend Implementation (Go)**
- Implement the `IterationRoom` logic in `pkg/state` to manage concurrency.
- Implement the `TeamAllocationService` handlers.
- Add "Delta" broadcast logic to push changes to all connected clients in a room.

#### **3. Frontend Implementation (React)**
- Setup **shadcn/ui** base components (Card, Dialog, Badge, Button).
- Implement the **Zustand store** (`useAllocationStore`) to handle the gRPC stream.
- Migrate the `MatchingService` logic (LP Solver) into an `LPSolverStrategy` class.
- Re-create the `ProjectCard` and `StudentPreview` components using JSX and Tailwind.

#### **4. Integration**
- Configure the Vite Federation plugin to expose the main dashboard.
- Verify the gRPC connection between the React client and the Go server.

---

## 📁 Key File Locations (Context)
- **Current Angular Source:** `client/src/app/`
- **Current Java Source:** `server/src/main/java/de/tum/cit/ase/tease/`
- **Matching Logic (Legacy):** `client/src/app/shared/matching/matching.service.ts`
- **Collaboration Logic (Legacy):** `client/src/app/shared/services/collaboration.service.ts`
- **New Migration Plan:** `migration-plan.md`
- **New Proto Definitions:** `proto/tease/v1/tease.proto`
