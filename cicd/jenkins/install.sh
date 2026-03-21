#!/bin/bash
# Jenkins EC2 Setup Script — Ubuntu 22.04
set -e

echo "=== Updating system ==="
sudo apt update -y && sudo apt upgrade -y

echo "=== Installing Docker ==="
sudo apt install docker.io -y
sudo systemctl enable docker && sudo systemctl start docker
sudo usermod -aG docker ubuntu
sudo usermod -aG docker jenkins

echo "=== Installing kubectl ==="
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

echo "=== Installing AWS CLI ==="
sudo apt install unzip -y
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip && sudo ./aws/install
rm -rf awscliv2.zip aws/

echo "=== Restarting Jenkins ==="
sudo systemctl restart jenkins

echo "=== Done ==="
docker --version && kubectl version --client --short && aws --version