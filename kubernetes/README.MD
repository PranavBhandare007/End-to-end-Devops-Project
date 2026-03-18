# Part 2 — Kubernetes Microservice Deployment with Monitoring

> **DevOps End-to-End Project Series**
> - ✅ Part 1 — Terraform Multi-Cloud Infrastructure Provisioning (AWS + GCP)
> - 🔄 Part 2 — Kubernetes Microservice Deployment with Monitoring ← You are here
> - ⏳ Part 3 — End-to-End CI/CD Pipeline with Jenkins

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Prerequisites](#prerequisites)
6. [Phase 1 — EKS Cluster Setup](#phase-1--eks-cluster-setup)
7. [Phase 2 — Dockerize the Application](#phase-2--dockerize-the-application)
8. [Phase 3 — Deploy to Kubernetes](#phase-3--deploy-to-kubernetes)
9. [Phase 4 — Monitoring with Prometheus](#phase-4--monitoring-with-prometheus)
10. [Phase 5 — Dashboards with Grafana](#phase-5--dashboards-with-grafana)
11. [Why YAML Manifests Over Direct Installation?](#why-yaml-manifests-over-direct-installation)
12. [Monitoring Approach Explained](#monitoring-approach-explained)
13. [Troubleshooting](#troubleshooting)
14. [Cleanup](#cleanup)

---

## Project Overview

This project deploys a full-stack application (React frontend + Python backend + PostgreSQL database) on Amazon EKS (Elastic Kubernetes Service). On top of the application, a complete monitoring stack using Prometheus and Grafana is deployed using raw Kubernetes YAML manifests — no Helm charts.

**What you will learn:**
- How to provision a production-grade Kubernetes cluster on AWS using EKS
- How to containerize a multi-service application with Docker
- How to write Kubernetes Deployment, Service, ConfigMap, and Secret manifests
- How Prometheus scrapes metrics from running pods
- How Grafana visualizes those metrics into dashboards
- Why GitOps (everything as code in Git) is the right approach

---

## Architecture

```
                         ┌─────────────────────────────────────────┐
                         │            AWS EKS Cluster              │
                         │                                         │
   User (Browser)        │  ┌─────────────┐                        │
        │                │  │  Namespace  │   app                  │
        ▼                │  │             │                        │
  ┌──────────┐           │  │  ┌────────────────────────────────┐  │
  │ NodePort │──────────►│  │  │  Frontend  (React + Nginx)     │  │
  │ Service  │           │  │  │  Deployment — 2 replicas       │  │
  └──────────┘           │  │  └──────────────┬─────────────────┘  │
                         │  │                 │ HTTP API calls     │
                         │  │  ┌──────────────▼─────────────────┐  │
                         │  │  │  Backend  (Python FastAPI)     │  │
                         │  │  │  Deployment — 2 replicas       │  │
                         │  │  └──────────────┬─────────────────┘  │
                         │  │                 │ SQL queries        │
                         │  │  ┌──────────────▼─────────────────┐  │
                         │  │  │  PostgreSQL Database           │  │
                         │  │  │  StatefulSet — 1 replica       │  │
                         │  │  └────────────────────────────────┘  │
                         │  └─────────────────────────────────────┘│
                         │                                         │
                         │  ┌─────────────┐                        │
                         │  │  Namespace  │    monitoring          │
                         │  │             │                        │
                         │  │  ┌──────────────────────────────┐    │
                         │  │  │  Prometheus                  │    │
                         │  │  │  Scrapes metrics from pods   │    │
                         │  │  └──────────────┬───────────────┘    │
                         │  │                 │ datasource         │
                         │  │  ┌──────────────▼───────────────┐    │
                         │  │  │  Grafana                     │    │
                         │  │  │  Visualizes dashboards       │    │
                         │  │  └──────────────────────────────┘    │
                         │  └──────────────────────────────────────┘
                         └─────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Cloud | AWS EKS | Managed Kubernetes cluster |
| Cluster CLI | eksctl | Create and manage EKS cluster |
| Container Runtime | Docker | Build and run containers |
| Container Registry | DockerHub | Store and pull Docker images |
| Frontend | React + Nginx | Serves the UI |
| Backend | Python (FastAPI) | REST API |
| Database | PostgreSQL | Persistent data storage |
| Orchestration | Kubernetes | Deploy, scale, manage containers |
| Monitoring | Prometheus | Metrics collection and storage |
| Dashboards | Grafana | Metrics visualization |
| IaC | Raw YAML manifests | All resources defined as code |

---

## Folder Structure

```
kubernetes/
├── README.md                        ← This file
│
├── apps/
│   ├── frontend/
│   │   ├── src/                     ← React source code
│   │   ├── Dockerfile               ← Multi-stage build (node → nginx)
│   │   └── nginx.conf               ← Nginx config to proxy API calls
│   │
│   ├── backend/
│   │   ├── main.py                  ← FastAPI application
│   │   ├── requirements.txt         ← Python dependencies
│   │   └── Dockerfile               ← Python image build
│   │
│   └── database/
│       └── init.sql                 ← Initial DB schema
│
├── manifests/
│   ├── namespaces/
│   │   ├── app-namespace.yaml       ← Namespace: app
│   │   └── monitoring-namespace.yaml← Namespace: monitoring
│   │
│   ├── app/
│   │   ├── frontend-deployment.yaml
│   │   ├── frontend-service.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── backend-service.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── postgres-service.yaml
│   │   ├── postgres-pvc.yaml        ← Persistent Volume Claim
│   │   └── secrets.yaml             ← DB credentials (base64 encoded)
│   │
│   └── monitoring/
│       ├── prometheus/
│       │   ├── namespace.yaml
│       │   ├── configmap.yaml       ← prometheus.yml scrape config
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   └── clusterrole.yaml     ← RBAC permissions to scrape pods
│       │
│       └── grafana/
│           ├── deployment.yaml
│           ├── service.yaml
│           └── datasource-configmap.yaml ← Auto-configure Prometheus datasource
```

---

## Prerequisites

Make sure the following are installed and configured on the machine you run commands from (EC2 or laptop):

```bash
# Verify all tools
aws --version          # AWS CLI v2
kubectl version --client  # kubectl
eksctl version         # eksctl
docker --version       # Docker
```

AWS credentials must be configured:
```bash
aws sts get-caller-identity
# Should return your Account ID and IAM user ARN
```

---

## Phase 1 — EKS Cluster Setup

### Step 1 — Create the cluster

```bash
eksctl create cluster \
  --name devops-project \
  --region us-east-1 \
  --nodegroup-name devops-nodes \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3 \
  --managed
```

> This takes 15–20 minutes. eksctl creates the VPC, subnets, IAM roles, and EC2 worker nodes automatically.

### Step 2 — Verify cluster connection

```bash
# eksctl automatically updates ~/.kube/config
kubectl get nodes
```

Expected output:
```
NAME                                          STATUS   ROLES    AGE   VERSION
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   2m    v1.xx
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   2m    v1.xx
```

### Step 3 — Create namespaces

Namespaces logically separate your app from monitoring resources inside the same cluster.

```bash
kubectl apply -f manifests/namespaces/
kubectl get namespaces
```

---

## Phase 2 — Dockerize the Application

### Step 1 — Build images

```bash
# Build frontend
docker build -t your-dockerhub-username/devops-frontend:v1 ./apps/frontend

# Build backend
docker build -t your-dockerhub-username/devops-backend:v1 ./apps/backend
```

### Step 2 — Push to DockerHub

```bash
docker login

docker push your-dockerhub-username/devops-frontend:v1
docker push your-dockerhub-username/devops-backend:v1
```

### Step 3 — Verify images on DockerHub

Log in to hub.docker.com and confirm both images appear under your account.

---

