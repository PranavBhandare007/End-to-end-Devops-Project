# DevOps End-to-End Project

![Terraform](https://img.shields.io/badge/Terraform-7B42BC?style=flat&logo=terraform&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-FF9900?style=flat&logo=amazonaws&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat&logo=kubernetes&logoColor=white)
![Jenkins](https://img.shields.io/badge/Jenkins-D24939?style=flat&logo=jenkins&logoColor=white)
![SonarQube](https://img.shields.io/badge/SonarQube-4E9BCD?style=flat&logo=sonarqube&logoColor=white)
![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat&logo=prometheus&logoColor=white)
![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat&logo=grafana&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)

A complete end-to-end DevOps project covering infrastructure provisioning, container orchestration, monitoring, and automated CI/CD — built entirely on AWS.

---

## Project Overview

This project is divided into three parts, each covering a core area of modern DevOps. Starting from raw infrastructure and ending with a fully automated deployment pipeline, every component is built from scratch using industry-standard tools.

The application deployed is a **User Management System** — a full-stack app with a React frontend, Python FastAPI backend, and PostgreSQL database — used as a real workload to demonstrate each DevOps concept in practice.

---

## Architecture

```
Developer pushes code
        │
        │  GitHub webhook
        ▼
Jenkins EC2 (CI/CD)
        │
        ├── SonarQube Analysis + Quality Gate
        ├── Build Docker images (tagged with build number)
        ├── Push to DockerHub
        └── envsubst + kubectl apply
                │
                ▼
        AWS EKS Cluster
        ├── namespace: app
        │   ├── Frontend  (React + Nginx)
        │   ├── Backend   (Python FastAPI)
        │   └── PostgreSQL (EBS volume)
        │
        └── namespace: monitoring
            ├── Prometheus  (metrics collection)
            ├── Grafana     (dashboards)
            ├── kube-state-metrics
            └── node-exporter
                │
                ▼
        AWS LoadBalancer → End User
```

---

## Project Parts

### ✅ Part 1 — Terraform Infrastructure Provisioning
> Folder: [`/terraform`](./terraform/README.md)

Provisioned cloud infrastructure on AWS using Terraform with reusable modules.

| Resource | Details |
|---|---|
| VPC | Custom VPC with public subnet |
| EC2 | Compute instance |
| Security Group | Inbound/outbound rules |
| S3 Bucket | Object storage |

---

### ✅ Part 2 — Kubernetes Microservice Deployment with Monitoring
> Folder: [`/kubernetes`](./kubernetes/README.md)

Deployed a full-stack application on Amazon EKS with a complete monitoring stack — all using raw YAML manifests, no Helm.

| Component | Tool |
|---|---|
| Cluster | AWS EKS (t3.small nodes) |
| Frontend | React + Vite + Nginx |
| Backend | Python FastAPI |
| Database | PostgreSQL (EBS persistent storage) |
| Metrics | Prometheus + kube-state-metrics + node-exporter |
| Dashboards | Grafana (dashboard IDs: 18283, 15661) |

---

### ✅ Part 3 — End-to-End CI/CD Pipeline with Jenkins
> Folder: [`/cicd`](./cicd/README.md)

Built an automated CI/CD pipeline triggered by GitHub webhooks. Every `git push` to `main` automatically scans code quality, builds, pushes, and deploys the application to EKS.

| Stage | Action |
|---|---|
| Checkout | Pull latest code from GitHub |
| SonarQube Analysis | Static code analysis for bugs and vulnerabilities |
| Quality Gate | Abort pipeline if code quality fails |
| Build | Docker build backend + frontend images |
| Push | Push images to DockerHub tagged with Jenkins build number |
| Deploy | `envsubst` injects build tag into YAML → `kubectl apply` |

---

## Tech Stack

| Category | Tool | Purpose |
|---|---|---|
| Infrastructure | Terraform | Provision AWS resources as code |
| Cloud | AWS | EKS, EC2, EBS, ALB, IAM |
| Containers | Docker | Build and package application images |
| Registry | DockerHub | Store and serve Docker images |
| Orchestration | Kubernetes (EKS) | Deploy and manage containerised workloads |
| CI/CD | Jenkins | Automate build, push, deploy pipeline |
| Code Quality | SonarQube | Static analysis and quality gate |
| Source Control | GitHub | Code storage + webhook trigger |
| Monitoring | Prometheus | Scrape and store metrics |
| Dashboards | Grafana | Visualise cluster and app metrics |
| Exporters | kube-state-metrics, node-exporter | Expose Kubernetes and node metrics |
| Frontend | React + Vite + Nginx | User interface |
| Backend | Python FastAPI | REST API |
| Database | PostgreSQL | Persistent data storage |

---

## Key Skills Demonstrated

```
Infrastructure as Code    → Terraform modules for VPC, EC2, S3
Containerisation          → Multi-stage Dockerfiles, Alpine images
Container Orchestration   → Kubernetes Deployments, Services,
                            StatefulSets, ConfigMaps, Secrets, PVCs
Monitoring & Observability→ Prometheus scraping, Grafana dashboards,
                            kube-state-metrics, node-exporter
CI/CD Automation          → Jenkins pipeline triggered by GitHub webhook
Code Quality              → SonarQube static analysis + Quality Gate
GitOps                    → Everything defined as code, stored in Git
Cloud                     → AWS EKS, EBS, ALB, IAM, EC2
Security                  → Secrets management, RBAC, IAM roles,
                            IfNotPresent pull policy, private subnets
Image Versioning          → Jenkins build number as Docker image tag,
                            full rollback capability
```

---

## Folder Structure

```
End-to-end-Devops-Project/
│
├── README.md                        ← This file
│
├── terraform/                       ← Part 1
│   ├── README.md
│   ├── backend.tf
│   ├── provider.tf
│   ├── main.tf
│   ├── variables.tf
│   └── modules/
│       ├── vpc/
│       ├── ec2/
│       └── security-group/
│
├── kubernetes/                      ← Part 2
│   ├── README.md
│   ├── apps/
│   │   ├── frontend/               ← React + Vite + Nginx
│   │   ├── backend/                ← Python FastAPI
│   │   └── database/               ← PostgreSQL init.sql
│   └── manifests/
│       ├── namespaces/
│       ├── app/                    ← App deployments and services
│       └── monitoring/             ← Prometheus, Grafana, exporters
│
└── cicd/                           ← Part 3
    ├── README.md
    └── jenkins/
        ├── Jenkinsfile             ← Full 7-stage pipeline definition
        └── install.sh              ← Jenkins EC2 setup script
```

---

## How to Reproduce

### Part 1 — Infrastructure
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### Part 2 — Kubernetes
```bash
# Create EKS cluster
eksctl create cluster \
  --name devops-project \
  --region us-west-2 \
  --node-type t3.small \
  --nodes 2

# Install EBS CSI driver and attach IAM policy
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster devops-project \
  --region us-west-2 \
  --force

# Deploy application
cd kubernetes
kubectl apply -f manifests/namespaces/
kubectl apply -f manifests/app/
kubectl apply -f manifests/monitoring/

# Get application URL
kubectl get service frontend-service -n app
```

### Part 3 — CI/CD
```bash
# Run setup script on Jenkins EC2
chmod +x cicd/jenkins/install.sh
./cicd/jenkins/install.sh

# Then configure Jenkins UI:
# 1. Add DockerHub and GitHub credentials
# 2. Configure SonarQube server and scanner
# 3. Add SonarQube webhook in SonarQube UI
# 4. Create Pipeline job pointing to cicd/jenkins/Jenkinsfile
# 5. Add GitHub webhook pointing to Jenkins
```

---

## Application

The deployed application is a **User Management System** accessible via the AWS LoadBalancer URL after deployment.

```
Features:
  ✅ View all users in a table with colour-coded avatars
  ✅ Add new user with name and email validation
  ✅ Delete user with instant feedback
  ✅ Live user count stats
  ✅ Auto-refresh after every action
```

---

## Cleanup

```bash
# Delete EKS cluster
eksctl delete cluster --name devops-project --region us-west-2

# Destroy Terraform infrastructure
cd terraform && terraform destroy

# Stop Jenkins EC2 from AWS Console when not in use
# EC2 → Instances → Jenkins EC2 → Instance State → Stop
```

> ⚠️ Always delete the EKS cluster when not using it — EKS charges ~$0.10/hr for the control plane plus EC2 costs for worker nodes.

---

*Built for learning and portfolio purposes — documenting a complete DevOps workflow from infrastructure to deployment.*
