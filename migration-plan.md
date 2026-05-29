# TEASE Next-Gen Blueprint: Architecture & Migration Plan

## 1. Shared Contract (The Source of Truth)
*   **Technology:** Protobuf + Connect RPC.
*   **Goal:** Define `Student`, `Project`, `Allocation`, and `Constraint` models once.
*   **Extensibility:** Use `google.protobuf.Any` or specific message types to allow the `Constraint` model to grow without breaking the API.

## 2. Backend: Go Modular Core
*   **Architecture:** Hexagonal (Ports & Adapters).
*   **`pkg/tease/domain`**: Pure business logic and structs (Protobuf generated types).
*   **`pkg/tease/state`**: Thread-safe in-memory store (`sync.Map` or RWMutex protected) for active "Rooms" (Course Iterations).
*   **`pkg/tease/sync`**: Management of gRPC streams, handling broadcast logic, Delta Updates, and Optimistic Concurrency Control (OCC).
*   **Modularity:** The core can be imported as a library into PROMPT's Go backend or wrapped in a standalone `main.go`.

## 3. Frontend: React + shadcn/ui
*   **State Management:** **Zustand** for global allocation state.
*   **UI Library:** **shadcn/ui** (Radix + Tailwind) for a modern, accessible interface.
*   **Drag & Drop:** **`@dnd-kit`** to replace Dragula.
*   **Strategy Pattern:** An `AllocationStrategy` interface to allow switching between the current browser-based LP solver and future server-side or manual solvers.
*   **Integration:** Vite Module Federation (`@originjs/vite-plugin-federation`) to expose the TEASE dashboard as a remote module for the PROMPT React shell.

## 4. Quality & Testing Strategy
*   **Server Unit Tests:** Standard Go `testing` package for the state engine and conflict resolution logic. Use `bufconn` for in-memory gRPC integration testing.
*   **Client Unit Tests:** **Vitest** + **React Testing Library** for hooks and component logic. Use a Mock Connect Transport to simulate remote updates.
*   **E2E Tests:** **Playwright** to simulate real-time collaboration (two browsers moving students simultaneously).

## 5. Collaboration & Edge Cases
*   **Conflict Resolution:** Implement Optimistic Concurrency Control (OCC) using versioning/timestamps. Reject conflicting changes.
*   **Performance:** Use Delta Updates for the Connect stream to avoid full state synchronization on every drag-and-drop action.
