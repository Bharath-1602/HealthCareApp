# 🚀 EC2 Deployment Guide — HealthCare Pro

## Prerequisites
- **AWS EC2 instance** running **Ubuntu 22.04 LTS** (t2.medium or larger recommended)
- **Security Group**: Allow inbound ports **80** (HTTP), **22** (SSH)
- **SSH access** to your instance

---

## Step 1 — Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

## Step 2 — Install Docker & Docker Compose

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Add current user to docker group (avoids sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 3 — Clone / Upload the Project

**Option A — Git Clone** (if you pushed to a repo):
```bash
git clone https://github.com/<YOUR_USER>/HealthCareApp.git
cd HealthCareApp
```

**Option B — SCP Upload** (from your local machine):
```bash
# Run this from your LOCAL machine
scp -i your-key.pem -r ./HealthCareApp ubuntu@<YOUR_EC2_PUBLIC_IP>:~/
```

Then on EC2:
```bash
cd ~/HealthCareApp
```

---

## Step 4 — Configure Environment Variables

```bash
# The .env file is already included, but verify/edit if needed:
cat .env

# It should contain:
# MYSQL_ROOT_PASSWORD=healthcare_root_2024
# JWT_SECRET=healthcare_jwt_super_secret_key_2024
# NODE_ENV=production
```

> ⚠️ **For production**, change the passwords and JWT secret to strong random values!

---

## Step 5 — Build & Start All Services

```bash
# Build all Docker images
docker compose build

# Start all containers in detached mode
docker compose up -d

# Check status — all should be "Up" or "healthy"
docker compose ps
```

> 🕐 **First startup takes 2-3 minutes** as MySQL initializes databases.

---

## Step 6 — Verify Deployment

```bash
# Check all containers are running
docker compose ps

# Test API Gateway
curl http://localhost/api/auth/login

# Check individual service health
curl http://localhost:3002/health
curl http://localhost:3005/health
curl http://localhost:3001/health

# View logs for a specific service
docker compose logs -f user-management-service
```

---

## Step 7 — Access the Application

Open your browser and navigate to:

```
http://<YOUR_EC2_PUBLIC_IP>
```

### Default Admin Credentials:
- **Username:** `admin`
- **Password:** `admin123`

---

## Useful Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data!)
docker compose down -v

# Rebuild a specific service
docker compose build user-management-service
docker compose up -d user-management-service

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f frontend

# Check resource usage
docker stats

# Restart all services
docker compose restart
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker compose logs <service-name>

# Common fix: MySQL not ready yet — wait 30 seconds and retry
docker compose restart <service-name>
```

### Port 80 already in use
```bash
sudo lsof -i :80
# If nginx is running on host, stop it:
sudo systemctl stop nginx
```

### Database connection errors
```bash
# MySQL containers need ~30s to initialize on first start
# Check MySQL logs:
docker compose logs user-db

# If needed, reset a database:
docker compose down
docker volume rm healthcareapp_user-db-data
docker compose up -d
```

---

## Architecture Summary

```
Internet → EC2:80 → Nginx (frontend container)
                      ├── /          → Static HTML/CSS/JS
                      ├── /api/auth  → user-management-service:3002 ── user-db
                      ├── /api/users → user-management-service:3002 ── user-db
                      ├── /api/doctors → doctor-service:3005 ── doctor-db
                      ├── /api/registrations → registration-service:3004 ── registration-db
                      ├── /api/appointments → appointment-service:3001 ── appointment-db
                      ├── /api/vitals → vital-sign-service:3003 ── vital-db
                      ├── /api/posts → forum-service:3007 ── forum-db
                      ├── /api/complaints → complaint-service:3008 ── complaint-db
                      └── /api/admin → admin-service:3009 (no DB, aggregates from others)
```

Each service + its DB share a private Docker network. Only the gateway-net connects them all.
