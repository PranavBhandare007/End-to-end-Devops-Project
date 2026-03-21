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
│   │   ├── src/                     ← React source code (App.js, index.js)
│   │   ├── public/                  ← index.html
│   │   ├── package.json             ← React dependencies
│   │   ├── Dockerfile               ← Multi-stage build (node:alpine → nginx:alpine)
│   │   └── nginx.conf               ← Nginx config to proxy /api calls to backend
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
│   │   ├── frontend-service.yaml    ← LoadBalancer (AWS ALB, public DNS)
│   │   ├── backend-deployment.yaml
│   │   ├── backend-service.yaml
│   │   ├── postgres-statefulset.yaml
│   │   ├── postgres-service.yaml
│   │   ├── postgres-configmap.yaml  ← Holds init.sql mounted into postgres pod
│   │   ├── postgres-pvc.yaml        ← Persistent Volume Claim (1GB EBS storage)
│   │   └── secrets.yaml             ← DB credentials (never commit to Git)
│   │
│   └── monitoring/
│       ├── prometheus/
│       │   ├── configmap.yaml       ← prometheus.yml scrape config
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   └── clusterrole.yaml     ← RBAC permissions to scrape pods
│       │
│       ├── grafana/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── datasource-configmap.yaml ← Auto-configure Prometheus datasource (uid: DS_PROMETHEUS)
│       │   └── dashboard-configmap.yaml  ← Pre-built app metrics dashboard
│       │
│       ├── kube-state-metrics/
│       │   ├── clusterrole.yaml     ← RBAC to read K8s API objects
│       │   ├── deployment.yaml      ← exposes pod/deployment/node metrics
│       │   └── service.yaml
│       │
│       └── node-exporter/
│           ├── daemonset.yaml       ← runs on every node, exposes CPU/memory/disk
│           └── service.yaml
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

### Step 1 — Create cluster and nodegroup

```bash
eksctl create cluster \
  --name devops-project \
  --region us-east-1 \
  --nodegroup-name devops-nodes \
  --node-type t3.small \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 2 \
  --managed
```

> This takes 15–20 minutes. Creates VPC, subnets, IAM roles, control plane and worker nodes.

> ⚠️ **Free tier note** — use `t3.micro` (free tier eligible). Using `t3.medium` or larger will cause nodegroup timeouts on free tier accounts.

### Step 2 — Update kubeconfig

```bash
aws eks update-kubeconfig \
  --name devops-project \
  --region us-east-1
```
### Step 3 — Verify cluster connection

```bash
kubectl get nodes
kubectl get nodes -o wide
```

Expected output:
```
NAME                                         STATUS   ROLES    AGE   VERSION
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   2m    v1.xx
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   2m    v1.xx
```

### Step 4 — Create namespaces

Namespaces logically separate your app from monitoring resources inside the same cluster.

```bash
kubectl apply -f manifests/namespaces/
kubectl get namespaces
```

---

## Phase 2 — Dockerize the Application

### Step 1 — Login to DockerHub

```bash
docker login
# Enter your DockerHub username and password
```

### Step 2 — Build and push backend

```bash
cd ~/End-to-end-Devops-Project/kubernetes/apps/backend

# Build using python:3.11-alpine (lightest, fewest vulnerabilities)
docker build -t pranav5/end-to-end-devops-project:backend-v1 .

docker push pranav5/end-to-end-devops-project:backend-v1
```

### Step 3 — Build and push frontend

```bash
cd ~/End-to-end-Devops-Project/kubernetes/apps/frontend

# Multi-stage build: node:18-alpine → nginx:alpine
docker build -t pranav5/end-to-end-devops-project:frontend-v1 .

docker push pranav5/end-to-end-devops-project:frontend-v1
```

### Step 4 — Verify images on DockerHub

Log in to hub.docker.com and confirm both tags appear under `pranav5/end-to-end-devops-project`.

```
pranav5/end-to-end-devops-project
├── backend-v1   ← Python FastAPI (python:3.11-alpine)
└── frontend-v1  ← React + Nginx  (nginx:alpine)
```

> **Why Alpine?** Alpine images are ~50MB vs ~150MB for slim/bookworm and have significantly fewer vulnerabilities flagged by scanners like Trivy or VS Code Docker extension.

---
## Phase 3 — Deploy to Kubernetes

> All commands run from `~/End-to-end-Devops-Project/kubernetes/`

### Step 1 — Install EBS CSI Driver

EKS needs this driver to provision EBS volumes for PostgreSQL persistent storage. Without it PVC will stay in `Pending` state forever.

```bash
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster devops-project \
  --region us-east-1 \
  --force
```

Attach the required IAM policy to the node role:
```bash
# Get node role name
ROLE_NAME=$(aws iam list-roles \
  --query "Roles[?contains(RoleName, 'NodeInstanceRole')].RoleName" \
  --output text)

echo $ROLE_NAME

# Attach EBS CSI policy
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy
```

Verify driver is running:
```bash
kubectl get pods -n kube-system | grep ebs
```

Expected:
```
ebs-csi-controller-xxxxxxxxx   6/6   Running   0   2m
ebs-csi-node-xxxxx             3/3   Running   0   2m
ebs-csi-node-xxxxx             3/3   Running   0   2m
```

### Step 2 — Apply in order

Order matters — secret and database must exist before backend, backend before frontend.

```bash
cd ~/End-to-end-Devops-Project/kubernetes

# 1. Namespaces first — everything else goes inside these
kubectl apply -f manifests/namespaces/

# 2. Secret — postgres and backend both need this
kubectl apply -f manifests/app/secrets.yaml

# 3. PostgreSQL ConfigMap — holds init.sql (creates tables + seed data)
kubectl apply -f manifests/app/postgres-configmap.yaml

# 4. Storage — EBS volume for postgres data
kubectl apply -f manifests/app/postgres-pvc.yaml

# 5. Database — StatefulSet
kubectl apply -f manifests/app/postgres-statefulset.yaml
kubectl apply -f manifests/app/postgres-service.yaml

# 6. Backend
kubectl apply -f manifests/app/backend-deployment.yaml
kubectl apply -f manifests/app/backend-service.yaml

# 7. Frontend — last
kubectl apply -f manifests/app/frontend-deployment.yaml
kubectl apply -f manifests/app/frontend-service.yaml
```

> ⚠️ `secrets.yaml` is in `.gitignore` — never commit real credentials to GitHub.

### Step 3 — Verify pods are running

```bash
# Watch pods come up live (Ctrl+C to stop)
kubectl get pods -n app -w
```

Expected output:
```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxxxxxxxx-xxxxx     1/1     Running   0          1m
frontend-xxxxxxxxx-xxxxx    1/1     Running   0          1m
postgres-0                  1/1     Running   0          1m
```

### Step 4 — Access the application

```bash
# Get LoadBalancer DNS name
kubectl get service frontend-service -n app -w
# Wait until EXTERNAL-IP column shows a DNS name (2-3 mins)
```

Open browser:
```
http://<EXTERNAL-IP>
```

> 💡 **Why LoadBalancer instead of NodePort?**
> EKS worker nodes are in private subnets — not directly reachable from the internet.
> LoadBalancer type tells AWS to provision an internet-facing ALB in the public subnet
> that forwards traffic into the private worker nodes automatically.

---
## Phase 4 — Monitoring with Prometheus

### Step 1 — Deploy Prometheus

```bash
cd ~/End-to-end-Devops-Project/kubernetes

kubectl apply -f manifests/monitoring/prometheus/clusterrole.yaml
kubectl apply -f manifests/monitoring/prometheus/configmap.yaml
kubectl apply -f manifests/monitoring/prometheus/deployment.yaml
kubectl apply -f manifests/monitoring/prometheus/service.yaml
```

### Step 2 — Deploy kube-state-metrics

Exposes Kubernetes API objects as metrics — pod status, deployment replicas, resource requests/limits:

```bash
kubectl apply -f manifests/monitoring/kube-state-metrics/clusterrole.yaml
kubectl apply -f manifests/monitoring/kube-state-metrics/deployment.yaml
kubectl apply -f manifests/monitoring/kube-state-metrics/service.yaml
```

### Step 3 — Deploy node-exporter

Runs as a DaemonSet on every node — exposes CPU, memory, disk, network metrics of EC2 machines:

```bash
kubectl apply -f manifests/monitoring/node-exporter/daemonset.yaml
kubectl apply -f manifests/monitoring/node-exporter/service.yaml
```

### Step 4 — Verify all monitoring pods are running

```bash
kubectl get pods -n monitoring
```

Expected:
```
NAME                                  READY   STATUS    AGE
prometheus-xxxxxxxxx-xxxxx            1/1     Running   1m
kube-state-metrics-xxxxxxxxx-xxxxx    1/1     Running   1m
node-exporter-xxxxx                   1/1     Running   1m
node-exporter-xxxxx                   1/1     Running   1m
```

### Step 5 — Expose Prometheus via LoadBalancer

```bash
kubectl patch service prometheus-service -n monitoring \
  -p '{"spec": {"type": "LoadBalancer"}}'

kubectl get service prometheus-service -n monitoring -w
```

### Step 6 — Access Prometheus UI

Open browser: `http://<PROMETHEUS-EXTERNAL-IP>:9090`

Go to **Status → Targets** — all jobs should show `UP`:
```
✅ prometheus
✅ backend
✅ kube-state-metrics
✅ node-exporter
✅ kubernetes-pods
```

---

## Phase 5 — Dashboards with Grafana

### Step 1 — Deploy Grafana

```bash
kubectl apply -f manifests/monitoring/grafana/datasource-configmap.yaml
kubectl apply -f manifests/monitoring/grafana/dashboard-configmap.yaml
kubectl apply -f manifests/monitoring/grafana/deployment.yaml
kubectl apply -f manifests/monitoring/grafana/service.yaml
```

### Step 2 — Expose Grafana via LoadBalancer

```bash
kubectl patch service grafana-service -n monitoring \
  -p '{"spec": {"type": "LoadBalancer"}}'

kubectl get service grafana-service -n monitoring -w
```

### Step 3 — Access Grafana UI

Open browser: `http://<GRAFANA-EXTERNAL-IP>:3000`

Login:
- Username: `admin`
- Password: `admin123`

### Step 4 — Import Dashboards

Go to **Dashboards → New → Import** and import these dashboard IDs one by one:

| Dashboard ID | Name | Shows |
|---|---|---|
| `18283` | Kubernetes Cluster Resource Overview | CPU/RAM per node, pod distribution, namespace breakdown |
| `15661` | Kubernetes Cluster Monitoring | Global CPU/RAM usage, running pods, deployment replicas |


**Import steps for each dashboard:**
1. Go to **Dashboards → New → Import**
2. Enter the dashboard ID
3. Click **Load**
4. Select **DS_PROMETHEUS** as datasource
5. Click **Import**

### Step 5 — What you should see

```
Dashboard 18283 — Node Resource Overview:
  ✅ Total Nodes: 2
  ✅ Total Pods: 20
  ✅ Workload: 14
  ✅ Memory/CPU usage graphs live
  ✅ Namespace breakdown (kube-system, monitoring, app)

Dashboard 15661 — Cluster Monitoring:
  ✅ Global CPU Usage         (4.73%)
  ✅ Global RAM Usage         (53.79%)
  ✅ Running Pods per namespace
  ✅ Deployment Replicas: 11, Updated: 11, Unavailable: 0
  ✅ Number of Nodes: 2
```

---

## Why YAML Manifests Over Direct Installation?

This is one of the most important concepts to understand in Kubernetes.

### Option A — Direct Installation (wrong approach)

You SSH into a node and run:
```bash
# Installing directly on the machine
sudo apt install prometheus
sudo apt install grafana
```

**Problems with this:**
- If the node crashes, Prometheus and Grafana are gone
- No version control — nobody knows what was installed or when
- Cannot reproduce the setup on another cluster
- Manual — does not scale
- Kubernetes has no knowledge of these processes — cannot restart them

### Option B — Raw YAML Manifests (correct approach)

You write a `deployment.yaml` and run:
```bash
kubectl apply -f deployment.yaml
```

**Why this is correct:**
- Kubernetes manages the lifecycle — if Prometheus crashes, Kubernetes restarts it automatically
- Everything is in Git — full history, reviewable, reproducible
- Apply the same YAML to any cluster and get identical results
- This is real-world GitOps practice used in production

```
Direct Install          vs      YAML Manifest
──────────────                  ──────────────
Manual steps                    Single kubectl apply
Lives on one machine            Managed by Kubernetes
Dies if node crashes            Auto-restarted by K8s
Not in Git                      Version controlled
Not reproducible                100% reproducible
```

---

## Monitoring Approach Explained

### How Prometheus works in Kubernetes

Prometheus uses a **pull model** — it reaches out to your pods and scrapes metrics on a schedule (every 15 seconds by default).

```
Every 15 seconds:

Prometheus Pod
     │
     ├──► scrapes http://backend-pod-ip:8000/metrics   → stores time-series data
     ├──► scrapes http://frontend-pod-ip:80/metrics     → stores time-series data
     └──► scrapes http://postgres-pod-ip:9187/metrics   → stores time-series data
```

Your application pods expose a `/metrics` endpoint. Prometheus knows which pods to scrape through the `prometheus.yml` ConfigMap which contains **scrape configs**.

### How Grafana works

Grafana does not collect any data itself. It connects to Prometheus as a **datasource** and queries it using PromQL (Prometheus Query Language) to build dashboards.

```
Grafana Dashboard
     │
     └──► PromQL query ──► Prometheus ──► Returns time-series data ──► Rendered as graph
```

### Why a ConfigMap for prometheus.yml?

`prometheus.yml` is the configuration file that tells Prometheus:
- Which pods/services to scrape
- How often to scrape
- What labels to apply

In Kubernetes, you cannot bake config files into running containers easily. A **ConfigMap** stores the config as a Kubernetes object, which gets mounted as a file inside the Prometheus pod. This means you can update the scrape config without rebuilding the Docker image.

```
ConfigMap (prometheus.yml)
         │
         │ mounted as file at /etc/prometheus/prometheus.yml
         ▼
   Prometheus Pod
   reads config on startup
```

### RBAC — Why Prometheus needs a ClusterRole

By default, pods cannot read information about other pods in the cluster. Prometheus needs to discover pods to scrape them. A **ClusterRole** grants Prometheus read permission on pods, services, and endpoints across all namespaces.

```
ClusterRole  →  grants permissions
     │
ClusterRoleBinding  →  assigns role to Prometheus ServiceAccount
     │
Prometheus Pod  →  uses ServiceAccount  →  can now list and watch pods
```
---
