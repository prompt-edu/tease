# ─────────────────────────────────────────────────────────────────────────────
# TEASE Makefile
# Simplifies development commands for all services
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: help install install-react install-go \
        dev dev-demo dev-react dev-go \
        build build-react build-react-traefik build-go \
        test test-react test-react-watch test-react-coverage test-go e2e \
        proto-gen docker-up docker-down docker-build docker-logs \
        docker-prod-up docker-prod-down clean typecheck fmt

# Default target
help:
	@echo "TEASE Development Commands"
	@echo ""
	@echo "Quick Start:"
	@echo "  make install      Install all dependencies"
	@echo "  make dev          Start React client + Go server"
	@echo "  make dev-demo     Start React client with demo data enabled"
	@echo ""
	@echo "Individual Services:"
	@echo "  make dev-react    Start React client (port 5173)"
	@echo "  make dev-go       Start Go server (port 8081)"
	@echo ""
	@echo "Build:"
	@echo "  make build        Build all services"
	@echo "  make build-react  Build React client"
	@echo "  make build-go     Build Go server"
	@echo ""
	@echo "Testing:"
	@echo "  make test         Run all unit tests (React + Go)"
	@echo "  make test-react   Run React unit tests (vitest)"
	@echo "  make test-go      Run Go unit tests (with race detector)"
	@echo "  make e2e          Run Playwright e2e tests"
	@echo ""
	@echo "Proto:"
	@echo "  make proto-gen    Regenerate TypeScript + Go code from proto"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up    Start all services via docker-compose"
	@echo "  make docker-down  Stop all docker services"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean        Clean build artifacts"
	@echo "  make typecheck    TypeScript type check (no emit)"
	@echo "  make fmt          Format Go code"

# ─────────────────────────────────────────────────────────────────────────────
# Install Dependencies
# ─────────────────────────────────────────────────────────────────────────────

install:
	@echo "Installing React client dependencies..."
	cd client-react && npm install
	@echo "Installing Go server dependencies..."
	cd server-go && go mod download
	@echo "Done!"

install-react:
	cd client-react && npm install

install-go:
	cd server-go && go mod download

# ─────────────────────────────────────────────────────────────────────────────
# Development Servers
# ─────────────────────────────────────────────────────────────────────────────

# Start React client + Go server (most common dev setup)
dev: dev-go dev-react

# Start React client with demo mode enabled (shows "Load Example" in Data menu)
dev-demo:
	cd client-react && VITE_DEMO_MODE=true npm run dev

# Individual services
dev-react:
	cd client-react && npm run dev

dev-go:
	cd server-go && go run ./cmd/server

# ─────────────────────────────────────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────────────────────────────────────

build: build-react build-go

build-react:
	cd client-react && npm run build

build-react-traefik:
	cd client-react && npm run build:traefik

build-go:
	cd server-go && go build -o bin/server ./cmd/server

# ─────────────────────────────────────────────────────────────────────────────
# Testing
# ─────────────────────────────────────────────────────────────────────────────

test: test-react test-go

test-react:
	cd client-react && npm run test

test-react-watch:
	cd client-react && npm run test:watch

test-react-coverage:
	cd client-react && npm run test:coverage

test-go:
	cd server-go && go test ./... -race

e2e:
	cd client-react && npm run e2e

# ─────────────────────────────────────────────────────────────────────────────
# Proto Code Generation
# ─────────────────────────────────────────────────────────────────────────────

proto-gen:
	@echo "Regenerating Go code from proto..."
	protoc \
	  --proto_path=proto \
	  --go_out=server-go/pkg/gen --go_opt=paths=source_relative \
	  --connect-go_out=server-go/pkg/gen --connect-go_opt=paths=source_relative \
	  proto/tease/v1/tease.proto
	@echo "Regenerating TypeScript code from proto..."
	protoc \
	  --proto_path=proto \
	  --es_out=client-react/src/gen --es_opt=target=ts \
	  --connect-es_out=client-react/src/gen --connect-es_opt=target=ts \
	  proto/tease/v1/tease.proto
	@echo "Done! Review generated files in server-go/pkg/gen/ and client-react/src/gen/"

# ─────────────────────────────────────────────────────────────────────────────
# Docker
# ─────────────────────────────────────────────────────────────────────────────

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build

docker-logs:
	docker-compose logs -f

# Production docker setup
docker-prod-up:
	docker-compose -f docker-compose.prod.yml up -d

docker-prod-down:
	docker-compose -f docker-compose.prod.yml down

# ─────────────────────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────────────────────

clean:
	rm -rf client-react/dist
	rm -rf client-react/node_modules/.vite
	rm -rf server-go/bin
	@echo "Cleaned build artifacts"

# Type checking
typecheck:
	cd client-react && npx tsc --noEmit

# Format Go code
fmt:
	cd server-go && go fmt ./...
