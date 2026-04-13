# Part 3 — End-to-End CI/CD Pipeline with Jenkins

> **DevOps End-to-End Project Series**
> - ✅ Part 1 — Terraform Multi-Cloud Infrastructure Provisioning (AWS + GCP)
> - ✅ Part 2 — Kubernetes Microservice Deployment with Monitoring
> - ✅ Part 3 — End-to-End CI/CD Pipeline with Jenkins ← You are here

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Prerequisites](#prerequisites)
6. [Phase 1 — Jenkins Setup](#phase-1--jenkins-setup)
7. [Phase 2 — GitHub Webhook Integration](#phase-2--github-webhook-integration)
8. [Phase 3 — Jenkins Pipeline Job](#phase-3--jenkins-pipeline-job)
9. [Phase 4 — Jenkinsfile Explained](#phase-4--jenkinsfile-explained)
10. [Phase 5 — Automatic Deployment Flow](#phase-5--automatic-deployment-flow)
11. [Troubleshooting](#troubleshooting)
12. [Cleanup](#cleanup)

---

## Project Overview

This project builds a complete CI/CD pipeline that automatically builds and deploys the full-stack application from Part 2 whenever code is pushed to GitHub. Jenkins orchestrates the entire pipeline — from pulling code, building Docker images, pushing to DockerHub, and rolling out updates to the EKS cluster — all without any manual steps.

**What you will learn:**
- How to configure Jenkins on an EC2 instance with all required tools
- How to connect Jenkins to GitHub using webhooks for automatic triggering
- How to securely store DockerHub credentials in Jenkins
- How to write a multi-stage Jenkinsfile
- How `imagePullPolicy: Always` enables zero-config deployments
- What a real-world GitOps CI/CD flow looks like end to end

---

## Architecture

```
Developer pushes code to GitHub
          │
          │  webhook fires instantly
          ▼
  Jenkins EC2 (c7i-flex.large, Ubuntu 22.04)
          │
          ├── Stage 1: Checkout         → pulls latest code from GitHub
          ├── Stage 2: SonarQube        → static code analysis
          ├── Stage 3: Quality Gate     → aborts if code quality fails
          ├── Stage 4: Build Backend    → docker build backend image
          ├── Stage 5: Build Frontend   → docker build frontend image
          ├── Stage 6: Push Images      → pushes both to DockerHub
          └── Stage 7: Deploy to EKS   → envsubst + kubectl apply
                    │
                    ▼
          AWS EKS Cluster (us-east-1)
          ├── frontend pod  ← pulls new image with build tag
          └── backend pod   ← pulls new image with build tag
                    │
                    ▼
          AWS LoadBalancer → End User
```

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Jenkins | CI/CD orchestration — runs all pipeline stages |
| GitHub | Source code storage + webhook trigger |
| SonarQube | Static code analysis and quality gate |
| Docker | Build and package app into container images |
| DockerHub | Store and serve Docker images (`pranav5/end-to-end-devops-project`) |
| kubectl | Deploy updated images to EKS cluster |
| AWS EKS | Kubernetes cluster running the application |
| AWS CLI | Authenticate Jenkins to AWS for kubectl access |

---

## Folder Structure

```
cicd/
├── README.md                   ← This file
│
└── jenkins/
    ├── Jenkinsfile             ← Complete pipeline definition (all 7 stages)
    └── install.sh              ← Setup script for Jenkins EC2
```

---

## Prerequisites

### Jenkins EC2:
- Instance type: `c7i-flex.large` (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04
- Jenkins installed and running on port `8080`
- Security group: port `8080` open inbound

### Tools installed on Jenkins EC2:
```bash
# Verify all tools
docker --version         # Docker
kubectl version --client # kubectl
aws --version            # AWS CLI
git --version            # Git
```

### Jenkins Plugins installed:
- Git
- Pipeline
- Docker Pipeline
- GitHub Integration
- SonarQube Scanner

### Tools configured in Jenkins:
- SonarQube Scanner — configured under `Manage Jenkins → Tools → SonarQube Scanner`
  - Name must match: `sonar-scanner`

### SonarQube server configured in Jenkins:
- Configured under `Manage Jenkins → System → SonarQube servers`
  - Name must match: `sonar-server`
  - URL: `http://<SONARQUBE-IP>:9000`

### Credentials stored in Jenkins:
- DockerHub — `dockerhub-credentials` (username + password)
- GitHub — for repo access
- SonarQube token — added under SonarQube server configuration

---

## Phase 1 — Jenkins Setup

### Step 1 — Give Jenkins permission to use Docker

```bash
# Add jenkins user to docker group
sudo usermod -aG docker jenkins

# Restart Jenkins to apply
sudo systemctl restart jenkins

# Verify Jenkins can use Docker
sudo -u jenkins docker ps
```

### Step 2 — Configure AWS CLI for Jenkins user

```bash
# Switch to Jenkins user
sudo su - jenkins

# Configure AWS credentials
aws configure
# AWS Access Key ID:     → your access key
# AWS Secret Access Key: → your secret key
# Default region:        → us-east-1
# Default output format: → json

# Verify
aws sts get-caller-identity

# Exit jenkins user
exit
```

### Step 3 — Give Jenkins access to EKS cluster

```bash
# Update kubeconfig on ubuntu user first
aws eks update-kubeconfig \
  --name devops-project \
  --region us-east-1

# Copy kubeconfig to Jenkins home
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp ~/.kube/config /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube

# Verify Jenkins can reach EKS
sudo -u jenkins kubectl get nodes
```

Expected output:
```
NAME                                         STATUS   ROLES    AGE
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   Xd
ip-192-168-xx-xx.us-east-1.compute.internal  Ready    <none>   Xd
```

### Step 4 — Add DockerHub credentials in Jenkins UI

```
Jenkins UI
→ Manage Jenkins
→ Credentials
→ System
→ Global credentials
→ Add Credentials

Kind:     Username with password
Username: pranav5
Password: <your-dockerhub-password>
ID:       dockerhub-credentials
→ Create
```

### Step 5 — Add GitHub credentials in Jenkins UI

```
Jenkins UI
→ Manage Jenkins
→ Credentials
→ System
→ Global credentials
→ Add Credentials

Kind:     Username with password
Username: <your-github-username>
Password: <your-github-personal-access-token>
ID:       github-credentials
Description: GitHub Access
→ Create
```

> 💡 **How to generate a GitHub Personal Access Token:**
> GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
> → Generate new token → Select scopes: `repo`, `admin:repo_hook`
> → Generate token → copy it immediately (shown only once)

### Step 6 — Configure SonarQube in Jenkins

**Add SonarQube server:**
```
Jenkins UI
→ Manage Jenkins
→ System
→ SonarQube servers
→ Add SonarQube

Name:   sonar-server
URL:    http://<SONARQUBE-IP>:9000
Token:  Add → Secret text → paste SonarQube token → ID: sonar-token
→ Save
```

**Add SonarQube Scanner tool:**
```
Jenkins UI
→ Manage Jenkins
→ Tools
→ SonarQube Scanner
→ Add SonarQube Scanner

Name:                  sonar-scanner
Install automatically: ✅
→ Save
```

**Add webhook in SonarQube so it notifies Jenkins when Quality Gate is ready:**
```
SonarQube UI → http://<SONARQUBE-IP>:9000
→ Administration
→ Configuration
→ Webhooks
→ Create

Name: jenkins
URL:  http://<JENKINS-EC2-IP>:8080/sonarqube-webhook/
→ Create
```

> ⚠️ Without the SonarQube webhook, the `waitForQualityGate` step will hang indefinitely — Jenkins waits for a notification that never arrives.

---

## Phase 2 — GitHub Webhook Integration

### Step 1 — Add webhook in GitHub

```
Your GitHub repo
→ Settings
→ Webhooks
→ Add webhook

Payload URL:  http://<JENKINS-EC2-PUBLIC-IP>:8080/github-webhook/
Content type: application/json
Events:       Just the push event ✅
Active:       ✅
→ Add webhook
```

### Step 2 — Enable webhook trigger in Jenkins job

```
Jenkins job → Configure
→ Build Triggers section
→ ✅ GitHub hook trigger for GITScm polling
→ Save
```

Now every `git push` to the `main` branch automatically triggers the pipeline within seconds.

---

## Phase 3 — Jenkins Pipeline Job

### Step 1 — Create the job

```
Jenkins UI
→ New Item
→ Name: devops-cicd-pipeline
→ Select: Pipeline
→ OK
```

### Step 2 — Configure the job

```
General:
  ✅ GitHub project
  URL: https://github.com/pranav5/End-to-end-Devops-Project

Build Triggers:
  ✅ GitHub hook trigger for GITScm polling

Pipeline:
  Definition:     Pipeline script from SCM
  SCM:            Git
  Repository URL: https://github.com/pranav5/End-to-end-Devops-Project
  Credentials:    select your GitHub credentials
  Branch:         */main
  Script Path:    cicd/jenkins/Jenkinsfile

→ Save
```

---

## Phase 4 — Jenkinsfile Explained

The complete pipeline is defined in `cicd/jenkins/Jenkinsfile`. It has 7 stages:

```
Stage 1 — Checkout          pulls latest code from GitHub
Stage 2 — SonarQube Analysis  scans .py, .js, .jsx source files
Stage 3 — Quality Gate      aborts pipeline if code quality fails
Stage 4 — Build Backend     builds Python FastAPI Docker image
Stage 5 — Build Frontend    builds React + Nginx Docker image
Stage 6 — Push to DockerHub pushes both images tagged with Jenkins build number
Stage 7 — Deploy to EKS     uses envsubst to inject build tag into YAML → kubectl apply
```

The `post` block always cleans up local Docker images after the pipeline finishes, whether it passed or failed.

> See `cicd/jenkins/Jenkinsfile` for the full pipeline code.

### Image tagging strategy — Jenkins build number

Each build produces uniquely tagged images:
```
pranav5/end-to-end-devops-project:backend-1
pranav5/end-to-end-devops-project:backend-2   ← every build gets its own tag
pranav5/end-to-end-devops-project:frontend-1
pranav5/end-to-end-devops-project:frontend-2
```

Deployment YAMLs use `${BUILD_TAG}` as a placeholder:
```yaml
image: pranav5/end-to-end-devops-project:frontend-${BUILD_TAG}
imagePullPolicy: IfNotPresent
```

`IfNotPresent` is correct here — since every build tag is unique, Kubernetes will never find it cached locally and will always pull the new image. No need for `Always` which pulls on every pod restart regardless.

This enables full traceability and easy rollback:
```bash
# Roll back to build 3
kubectl set image deployment/frontend \
  frontend=pranav5/end-to-end-devops-project:frontend-3 -n app
```

### Declarative deployment with envsubst

Instead of `kubectl set image`, the pipeline uses `envsubst` to inject the build tag into the deployment YAML before applying:

```bash
envsubst < ./kubernetes/manifests/app/backend-deployment.yaml | kubectl apply -f - -n app
```

This means the YAML files use a variable placeholder:
```yaml
image: pranav5/end-to-end-devops-project:backend-${BUILD_TAG}
```

`envsubst` replaces `${BUILD_TAG}` with the actual Jenkins build number before sending to Kubernetes — keeping everything declarative and version-controlled.

### Why Quality Gate matters

```
Code pushed → SonarQube scans → Quality Gate check
                                        │
                        ┌───────────────┴────────────────┐
                        │                                │
                     PASSED                           FAILED
                        │                                │
                        ▼                                ▼
              Pipeline continues              Pipeline aborts here
              Build → Push → Deploy          No broken code reaches EKS
```

---

## Phase 5 — Automatic Deployment Flow

After setup, the entire flow is automatic. Developer only needs to push code:

```bash
# Developer makes a change
vim kubernetes/apps/frontend/src/App.jsx

# Push to GitHub
git add .
git commit -m "feat: update UI"
git push

# What happens automatically:
# 1. GitHub webhook fires      → Jenkins triggered in seconds
# 2. Jenkins pulls code        → latest from main branch
# 3. SonarQube scans code      → checks for bugs and vulnerabilities
# 4. Quality Gate evaluated    → pipeline aborts if quality fails
# 5. Builds Docker images      → backend-$BUILD_NUMBER, frontend-$BUILD_NUMBER
# 6. Pushes to DockerHub       → unique tagged images available
# 7. envsubst injects tag      → YAML updated with build number
# 8. kubectl apply             → EKS pulls new images, replaces pods
# 9. App is live               → zero downtime rolling update
```

Total time from `git push` to live: **4-6 minutes**

---

## Application Features Deployed

The pipeline deploys a full User Management System:

```
Frontend (React + Vite + Nginx):
  ✅ View all users in a table with colour-coded avatars
  ✅ Add new user (name + email with validation)
  ✅ Delete user with instant feedback
  ✅ Live stats (total, active, inactive users)
  ✅ Auto-refresh after every action

Backend (Python FastAPI):
  GET    /api/users       → fetch all users from PostgreSQL
  POST   /api/users       → create a new user
  DELETE /api/users/{id}  → delete a user by ID
  GET    /metrics         → Prometheus scrapes this for monitoring
  GET    /                → health check endpoint
```

---

## Troubleshooting

Real issues encountered during this project and how they were resolved.

---

### Issue 1 — Jenkins cannot run Docker commands

**Error:**
```
Got permission denied while trying to connect to the Docker daemon socket
```

**Root Cause:**

Jenkins user is not in the `docker` group — it cannot communicate with the Docker daemon.

**Fix:**
```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins

# Verify
sudo -u jenkins docker ps
```

---

### Issue 2 — kubectl works for ubuntu user but not Jenkins user

**Error:**
```
error: no configuration has been provided
```

**Root Cause:**

kubeconfig lives at `~/.kube/config` under the ubuntu user's home directory. Jenkins user has a different home (`/var/lib/jenkins`) and cannot access it. Additionally the Jenkins user needs its own AWS credentials to authenticate with EKS.

**Fix:**
```bash
# Copy kubeconfig
sudo mkdir -p /var/lib/jenkins/.kube
sudo cp ~/.kube/config /var/lib/jenkins/.kube/config
sudo chown -R jenkins:jenkins /var/lib/jenkins/.kube

# Configure AWS CLI for Jenkins user separately
sudo su - jenkins
aws configure
exit

# Verify
sudo -u jenkins kubectl get nodes
```

---

### Issue 3 — Pipeline triggers but deploys old code

**Root Cause:**

Kubernetes caches the `latest` image on nodes. When the tag name does not change between deployments, Kubernetes skips pulling the new image and runs the cached old one.

**Fix — use Jenkins build number as image tag + `IfNotPresent` pull policy:**

```groovy
// Jenkinsfile
BUILD_TAG = "${BUILD_NUMBER}"
// produces: frontend-1, frontend-2, frontend-3 etc.
```

```yaml
# deployment.yaml
image: pranav5/end-to-end-devops-project:frontend-${BUILD_TAG}
imagePullPolicy: IfNotPresent
```

```
Why this works:
  Build 5 → image: frontend-5 → not cached → pulls ✅
  Build 6 → image: frontend-6 → not cached → pulls ✅
  Same build redeployed → already cached → skips pull ✅ (saves bandwidth)

IfNotPresent vs Always:
  Always        → pulls every time even if image is cached → wastes bandwidth
  IfNotPresent  → pulls only when tag is new → correct behaviour with build tags
```

---

## Cleanup

```bash
# Delete EKS cluster — stops all worker node EC2 charges
eksctl delete cluster \
  --name devops-project \
  --region us-east-1

# Stop Jenkins EC2 from AWS Console when not using it
# EC2 → Instances → Jenkins EC2 → Instance State → Stop
```

> ⚠️ Use **Stop** not **Terminate** for Jenkins EC2 — stopping preserves all your Jenkins configuration, jobs, and credentials for next time.

---

*Part of the DevOps End-to-End Project — documented for learning and portfolio purposes.*