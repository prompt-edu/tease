# TEASE

**T**eam **A**llocation D**e**cision **S**upport Syst**e**m - An intelligent decision-support tool for software engineering team allocation in multi-project courses, as used in the iPraktikum at TUM.

[![Build and Deploy to Dev](https://github.com/ls1intum/tease/actions/workflows/deploy-dev.yml/badge.svg)](https://github.com/ls1intum/tease/actions/workflows/deploy-dev.yml)

📖 **[Full Documentation](https://ls1intum.github.io/tease)** 

---

## 🌟 Overview

TEASE helps educators efficiently allocate students to project teams while considering multiple constraints such as skills, preferences, team diversity, and project requirements. The system uses constraint-based optimization to ensure fair and balanced team compositions.

### Key Features

- 📊 **Constraint-Based Allocation**: Define constraints for team size, skills, diversity (gender, nationality, language)
- 🎯 **Preference Matching**: Automatically assign students to their preferred projects while meeting all constraints
- 🔄 **Real-time Collaboration**: Multiple users can work simultaneously with live synchronization
- 📁 **Data Integration**: Import/export student data via CSV or direct integration with [PROMPT](https://github.com/ls1intum/prompt)
- 🔒 **Lock Mechanism**: Manually lock specific student allocations that should not change
- 📸 **Visual Export**: Export team compositions as images or CSV files
- 📈 **Analytics Dashboard**: View allocation statistics and constraint satisfaction metrics

![Dashboard](docs/Dashboard.jpeg)

---

## 🏗️ Architecture

TEASE follows a modern microservices architecture with separate client and server components:

### Technology Stack

**Client**
- **Framework**: Angular 19.1.1
- **UI Library**: Bootstrap 5.3.8 + ng-bootstrap 18.0.0
- **State Management**: RxJS 7.8.2
- **Real-time Communication**: STOMP over WebSocket
- **Charts**: Chart.js 4.5.1 + ng2-charts
- **Build**: Angular CLI with esbuild

**Server**
- **Framework**: Spring Boot 3.5.9
- **Runtime**: Java 21 (LTS)
- **WebSocket**: STOMP protocol for real-time communication
- **Build**: Maven 3.9

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (recommended)
- **OR** Node.js 18+ and Java 21+ (for local development)

### Option A: Using Docker (Recommended)

1. **Using pre-built images from GitHub Container Registry:**
   ```bash
   docker compose up
   ```

2. **Building from source:**
   ```bash
   docker compose up --build
   ```

3. **Access the application:**
   - Client: http://localhost/tease
   - Server: http://localhost:8081

### Option B: Local Development

#### Client Setup

```bash
cd client
npm install
npm start
```
The client will be available at http://localhost:80/

#### Server Setup

```bash
cd server
mvn clean install
mvn spring-boot:run
```
The server will be available at http://localhost:8081/

---


## 🔄 CI/CD Pipeline Architecture

TEASE uses a comprehensive GitHub Actions-based CI/CD pipeline for automated building, testing, and deployment.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   PR Opened  │  │ Push to Main │  │   Release    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          v                  v                  v
    ┌─────────┐        ┌──────────┐      ┌──────────┐
    │ Assign  │        │Build/Push│      │Build/Push│
    │ Author  │        │  to Dev  │      │ to Prod  │
    └─────────┘        └────┬─────┘      └────┬─────┘
                            │                  │
                    ┌───────┴────────┐  ┌──────┴────────┐
                    │                │  │               │
                    v                v  v               v
            ┌────────────────┐  ┌─────────────┐  ┌─────────────┐
            │Build & Push    │  │  Deploy     │  │  Deploy     │
            │Docker Images   │  │  to Dev     │  │  to Prod    │
            │                │  │             │  │             │
            │ • Client Image │  │ VM: Dev     │  │ VM: Prod    │
            │ • Server Image │  │ Environment │  │ Environment │
            └────────────────┘  └─────────────┘  └─────────────┘
                    │                  │                  │
                    v                  v                  v
            ┌────────────────┐  ┌─────────────┐  ┌─────────────┐
            │GitHub Container│  │Docker       │  │Docker       │
            │Registry (GHCR) │  │Compose Up   │  │Compose Up   │
            └────────────────┘  └─────────────┘  └─────────────┘
```

### Workflow Files

#### 1. **PR Opened** ([`.github/workflows/pr-opened.yml`](.github/workflows/pr-opened.yml))
- **Trigger**: When a pull request is opened
- **Actions**: Automatically assigns the PR to its author
- **Permissions**: `pull-requests: write`

#### 2. **Build and Deploy to Dev** ([`.github/workflows/deploy-dev.yml`](.github/workflows/deploy-dev.yml))
- **Trigger**: Push to `main` branch or PR to `main`
- **Actions**:
  1. Builds Docker images for client and server
  2. Pushes images to GitHub Container Registry with `latest` tag
  3. Deploys to development environment via SSH
- **Permissions**: `contents: read`, `packages: write`

#### 3. **Build and Deploy to Prod** ([`.github/workflows/deploy-prod.yml`](.github/workflows/deploy-prod.yml))
- **Trigger**: Release published
- **Actions**:
  1. Builds Docker images with release version tag
  2. Pushes to GitHub Container Registry
  3. Deploys to production environment
- **Permissions**: `contents: read`, `packages: write`

#### 4. **Build and Push** ([`.github/workflows/build-and-push.yml`](.github/workflows/build-and-push.yml))
- **Type**: Reusable workflow called by other workflows
- **Actions**:
  - Uses multi-stage Docker builds
  - Builds both client (Angular) and server (Spring Boot) images
  - Pushes to `ghcr.io/ls1intum/tease` and `ghcr.io/ls1intum/tease-server`
- **Permissions**: `contents: read`, `packages: write`

#### 5. **Deploy Docker** ([`.github/workflows/deploy-docker.yml`](.github/workflows/deploy-docker.yml))
- **Type**: Reusable workflow for deployment
- **Actions**:
  1. SSH to target VM via deployment gateway (jump host)
  2. Stop existing containers
  3. Copy updated docker-compose file
  4. Start new containers with `docker compose up`
- **Permissions**: `contents: read`

### Deployment Environments

#### Development Environment
- **URL**: `https://prompt.ase.cit.tum.de/tease`
- **Trigger**: Automatic on push to `main`
- **Purpose**: Testing and validation before production release

#### Production Environment
- **URL**: `https://prompt.ase.cit.tum.de/tease` (production path)
- **Trigger**: Manual release creation
- **Purpose**: Stable version for end users

### Deployment Flow

1. **Code Push/PR Merge** → GitHub Actions triggered
2. **Multi-stage Docker Build**:
   - Client: Node.js build → Nginx static serving
   - Server: Maven build → Java runtime
3. **Image Push** → GitHub Container Registry
4. **SSH Deployment**:
   - Connect via deployment gateway (jump host)
   - Pull latest images from GHCR
   - Update docker-compose configuration
   - Restart services with zero-downtime strategy
5. **Health Check** → Verify deployment success

### Security Features

- ✅ **Least Privilege Permissions**: Each workflow has minimal required permissions
- ✅ **Secret Management**: Sensitive data stored in GitHub Secrets
- ✅ **Jump Host**: Deployment via secure gateway server
- ✅ **Image Scanning**: Automated security scanning (planned)
- ✅ **Signed Commits**: Recommended for production releases

---

## 🎯 Usage Guide

### Importing Student Data

1. **CSV Import**: Upload a CSV file with student information (name, email, skills, preferences)
2. **PROMPT Integration**: Directly import from PROMPT if logged in as project management team member

### Creating Constraints

Define allocation rules based on:
- **Team Size**: Min/max students per team
- **Skills**: Required technical competencies
- **Diversity**: Gender, nationality, language distribution
- **Device Ownership**: Equipment requirements
- **Project Preferences**: Student ranking of projects

### Running Allocation

1. Click **"Run Allocation"** to execute the constraint solver
2. System automatically assigns students optimizing for:
   - Highest preference satisfaction
   - All constraint fulfillment
   - Balanced team compositions
3. Review results in the dashboard with visual feedback

### Exporting Results

- **CSV Export**: Download allocation as spreadsheet
- **PROMPT Export**: Push results directly to PROMPT system
- **Team Cards**: Generate visual team composition images

---

## 🤝 Integration with PROMPT

TEASE is designed to work seamlessly with [PROMPT](https://github.com/ls1intum/prompt) (Project Management and Organization Tool):

- **Single Sign-On**: Shared authentication via Keycloak
- **Data Synchronization**: Real-time updates between systems
- **Workflow Continuity**: Import student data from PROMPT, export allocations back
- **Shared Deployment**: Both applications run on the same infrastructure

---

## 📊 Deployment Diagram

![Deployment Diagram](docs/DeploymentDiagram.svg)

The diagram shows the complete architecture including:
- Load balancer (Traefik)
- Frontend (Angular) and Backend (Spring Boot) services
- Database connections
- Integration points with PROMPT


## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.


**Made with ❤️ by the AET Team at Technical University of Munich**
