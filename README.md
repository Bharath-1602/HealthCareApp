<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white" alt="Nginx" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

# 🏥 HealthCare Pro — Microservices Healthcare Management System

> A **production-ready**, fully containerized healthcare management platform built with a **microservices architecture**. The system comprises **8 independent Node.js services**, each with its own **MySQL database**, orchestrated via **Docker Compose** and unified behind an **Nginx API Gateway**.

---

## 📑 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Theoretical Background](#-theoretical-background)
  - [What Are Microservices?](#what-are-microservices)
  - [Why Microservices for Healthcare?](#why-microservices-for-healthcare)
  - [Key Architectural Concepts](#key-architectural-concepts)
  - [Design Patterns Used](#design-patterns-used-in-this-project)
  - [How a Request Flows Through the System](#how-a-request-flows-through-the-system)
- [Tech Stack](#-tech-stack)
- [Microservices](#-microservices)
  - [1. User Management Service](#1-user-management-service)
  - [2. Doctor Service](#2-doctor-service)
  - [3. Registration Service](#3-registration-service)
  - [4. Appointment Service](#4-appointment-service)
  - [5. Vital Sign Service](#5-vital-sign-service)
  - [6. Forum Service](#6-forum-service)
  - [7. Complaint Service](#7-complaint-service)
  - [8. Admin Service](#8-admin-service)
- [Frontend & API Gateway](#-frontend--api-gateway)
- [Port Mapping Reference](#-port-mapping-reference)
- [Database Architecture](#-database-architecture)
- [Docker Network Topology](#-docker-network-topology)
- [API Reference](#-api-reference)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Default Credentials](#-default-credentials)
- [Deployment on EC2](#-deployment-on-ec2)
- [Useful Docker Commands](#-useful-docker-commands)
- [Troubleshooting](#-troubleshooting)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## 🏗 Architecture Overview

```
Internet → :80 → Nginx (API Gateway + Static Frontend)
                   │
                   ├── /              → Static HTML/CSS/JS
                   ├── /api/auth      → user-management-service:3002  ── user-db
                   ├── /api/users     → user-management-service:3002  ── user-db
                   ├── /api/doctors   → doctor-service:3005           ── doctor-db
                   ├── /api/registrations → registration-service:3004 ── registration-db
                   ├── /api/appointments  → appointment-service:3001  ── appointment-db
                   ├── /api/vitals    → vital-sign-service:3003       ── vital-db
                   ├── /api/posts     → forum-service:3007            ── forum-db
                   ├── /api/complaints→ complaint-service:3008        ── complaint-db
                   └── /api/admin     → admin-service:3009            (no DB — aggregates)
```

Each microservice and its dedicated MySQL database share an **isolated Docker bridge network**. All services connect to a shared **`gateway-net`** for inter-service communication through Nginx.

---

## 📖 Theoretical Background

### What Are Microservices?

**Microservices architecture** is a software design approach where a large application is decomposed into a collection of **small, autonomous, loosely coupled services**. Each service:

- Runs in its **own process** and can be deployed independently
- Owns its **own data store** (no shared databases)
- Communicates with other services over **lightweight protocols** (typically HTTP/REST)
- Is organized around a **specific business capability** (e.g., "user management" or "appointments")
- Can be **developed, tested, and scaled independently** by separate teams

This contrasts with a **monolithic architecture**, where all functionality lives in a single codebase and deploys as one unit. In a monolith, a change to the appointment logic requires redeploying the entire system; in microservices, only the appointment service needs redeployment.

```
┌─────────────────────────────────────┐       ┌──────────┐  ┌──────────┐  ┌──────────┐
│           MONOLITH                  │       │ Service  │  │ Service  │  │ Service  │
│  Users + Doctors + Appointments     │  vs.  │  Users   │  │ Doctors  │  │ Appoint. │
│  + Vitals + Forum + Complaints      │       │   DB_1   │  │   DB_2   │  │   DB_3   │
│          Single Database            │       └──────────┘  └──────────┘  └──────────┘
└─────────────────────────────────────┘            MICROSERVICES
```

### Why Microservices for Healthcare?

Healthcare systems have unique requirements that make microservices an ideal fit:

1. **Data Isolation & Compliance** — Patient vitals, user credentials, and billing complaints contain sensitive data. Isolating each domain into its own database and network reduces the blast radius of a security breach. If the forum database is compromised, patient vitals remain untouched.

2. **Independent Scalability** — During peak hours, appointment booking may experience 10× the traffic while the forum remains idle. Microservices allow you to scale only the appointment service horizontally without wasting resources on components that don't need scaling.

3. **Fault Isolation** — If the complaint system crashes, patients can still book appointments and doctors can still view vitals. The `admin-service` in this project demonstrates this through `Promise.allSettled` — even if one service is down, the dashboard still shows partial data.

4. **Team Autonomy** — Different teams can own different services. The team working on vital signs monitoring doesn't need to understand the forum's comment threading logic. Each service has a clear API contract.

5. **Technology Flexibility** — While this project uses Node.js uniformly, the architecture allows any service to be rewritten in Python, Go, or Java without affecting others, as long as the REST API contract is maintained.

6. **Regulatory Requirements** — Healthcare regulations (like HIPAA) often require strict data access controls. Database-per-service ensures that each service can only access the data it needs — the forum service physically cannot query patient medical records.

### Key Architectural Concepts

#### 1. API Gateway Pattern

An **API Gateway** is a single entry point for all client requests. In this project, **Nginx** serves as the API Gateway:

```
                    ┌─────────────────────────┐
  Client Request    │      API GATEWAY        │
  ─────────────────>│       (Nginx:80)        │
  GET /api/doctors  │                         │
                    │  Route: /api/doctors/*   │──────> doctor-service:3005
                    │  Route: /api/vitals/*    │──────> vital-sign-service:3003
                    │  Route: /api/auth/*      │──────> user-management-service:3002
                    │  Route: /                │──────> Static HTML/CSS/JS
                    └─────────────────────────┘
```

**Benefits of an API Gateway:**
- **Single endpoint** — Clients only need to know one URL (`http://yourserver`), not 8 different ports
- **Routing** — Maps URL patterns to specific services
- **Header forwarding** — Passes `X-Real-IP` and `X-Forwarded-For` for client identification
- **SSL termination** — In production, handle HTTPS at the gateway level once
- **Rate limiting & caching** — Can be added at the gateway without modifying services

#### 2. Database-per-Service Pattern

Each microservice owns a **private database** that cannot be directly accessed by other services:

```
  ✅ CORRECT (this project)              ❌ ANTI-PATTERN
  ┌────────────┐  ┌────────────┐         ┌────────────┐  ┌────────────┐
  │ User Svc   │  │ Doctor Svc │         │ User Svc   │  │ Doctor Svc │
  └─────┬──────┘  └──────┬─────┘         └─────┬──────┘  └──────┬─────┘
        │                │                     │                │
   ┌────┴────┐      ┌────┴────┐           ┌────┴────────────────┴────┐
   │ user_db │      │doctor_db│           │    SHARED DATABASE      │
   └─────────┘      └─────────┘           └─────────────────────────┘
```

**Why this matters:**
- **Loose coupling** — Services don't depend on each other's schema. Changing a column in the `users` table doesn't break the doctor service.
- **Independent deployment** — Each service manages its own schema migrations.
- **Optimized storage** — Each database can be tuned for its specific workload.
- **Fault isolation** — A database crash only affects one service.

#### 3. Containerization with Docker

**Docker containers** package an application with all its dependencies (Node.js runtime, npm packages, config files) into a standardized unit:

```dockerfile
# Example: Each microservice Dockerfile
FROM node:18-alpine          # Base image with Node.js
WORKDIR /app                 # Set working directory
COPY package*.json ./        # Copy dependency manifest
RUN npm install --production # Install only production deps
COPY . .                     # Copy application code
EXPOSE 3002                  # Declare the port
CMD ["node", "app.js"]       # Start the application
```

**Docker Compose** then orchestrates all containers together, defining:
- **Build context** — Where to find each Dockerfile
- **Port mappings** — Which host port maps to which container port
- **Environment variables** — Database credentials, JWT secrets
- **Dependencies** — `depends_on` with health checks ensures databases are ready before services start
- **Networks** — Isolated communication channels between services
- **Volumes** — Persistent storage for database data

#### 4. JWT (JSON Web Token) Authentication

**JWT** is a stateless authentication mechanism used by the `user-management-service`:

```
  1. LOGIN                          2. SUBSEQUENT REQUESTS
  ┌────────┐    POST /api/auth/login    ┌────────────────┐
  │ Client │ ───────────────────────>   │ User Service   │
  │        │    {username, password}    │                │
  │        │                           │ Verify password│
  │        │    <───────────────────    │ Generate JWT   │
  │        │    {token: "eyJhbG..."}    └────────────────┘
  │        │
  │        │    GET /api/users/5
  │        │ ───────────────────────>   ┌────────────────┐
  │        │    Authorization:          │ User Service   │
  │        │    Bearer eyJhbG...        │                │
  │        │                           │ Verify JWT ✓   │
  │        │    <───────────────────    │ Return user    │
  └────────┘    {id:5, name:"..."}     └────────────────┘
```

**How JWT works in this project:**
1. User sends username + password to `/api/auth/login`
2. Server verifies the password against the bcrypt hash stored in MySQL
3. Server generates a JWT containing `{id, username, email, role, full_name}`, signed with `JWT_SECRET`
4. Token expires after **24 hours**
5. Client includes the token in the `Authorization: Bearer <token>` header for protected routes
6. The `authenticateToken` middleware verifies the signature and extracts user info
7. The `authorizeRole` middleware checks if the user's role has permission (e.g., only `admin` can delete users)

**JWT structure:** `Header.Payload.Signature`
- **Header** — Algorithm (HS256) and token type
- **Payload** — User data (id, role, name) + expiration time
- **Signature** — HMAC-SHA256 of header + payload using the secret key

#### 5. Reverse Proxy & Load Balancing

Nginx acts as a **reverse proxy** — clients connect to Nginx, and Nginx forwards requests to the appropriate backend service. The client never communicates directly with the microservices:

```nginx
# Nginx upstream definition
upstream doctor_service {
    server doctor-service:3005;    # Docker DNS resolves container name
}

# Route mapping
location /api/doctors/ {
    proxy_pass http://doctor_service;            # Forward to upstream
    proxy_set_header Host $host;                 # Preserve original host
    proxy_set_header X-Real-IP $remote_addr;     # Pass client's real IP
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

**Key concepts:**
- **Upstream blocks** define the backend service pools (can include multiple servers for load balancing)
- **Docker DNS** — Within Docker networks, containers are addressable by their container name (e.g., `doctor-service:3005`)
- **Header preservation** — `X-Real-IP` and `X-Forwarded-For` ensure backend services can identify the actual client, not just the proxy

#### 6. Health Checks & Service Discovery

Every microservice exposes a `/health` endpoint that returns its operational status:

```json
{ "status": "ok", "service": "doctor-service" }
```

Health checks serve multiple purposes:
- **Docker health checks** — MySQL containers use `mysqladmin ping` to signal readiness. Services won't start until their database reports healthy (`depends_on: condition: service_healthy`)
- **Admin monitoring** — The `admin-service` pings all services and aggregates their health status
- **Self-healing** — Docker's `restart: unless-stopped` policy automatically restarts crashed containers

#### 7. Graceful Degradation

The `admin-service` uses `Promise.allSettled` instead of `Promise.all` when aggregating stats:

```javascript
// If one service is down, others still return data
const results = await Promise.allSettled([
  axios.get('/api/users/count/total'),    // ✅ Returns 42
  axios.get('/api/doctors/count/total'),   // ❌ Service is down
  axios.get('/api/vitals/count/total')     // ✅ Returns 156
]);
// Result: { users: 42, doctors: 0, vitals: 156 }  — partial data, no crash
```

This ensures the admin dashboard remains functional even when individual services experience outages — a critical requirement for healthcare systems where monitoring should always be available.

### Design Patterns Used in This Project

| Pattern | Where Used | Explanation |
|:--------|:-----------|:------------|
| **API Gateway** | Nginx (`nginx.conf`) | Single entry point routing requests to backend services |
| **Database-per-Service** | All 7 DB services | Each service owns its data exclusively |
| **Service Aggregator** | `admin-service` | Collects data from multiple services into a unified response |
| **Health Check / Heartbeat** | All services (`/health`) | Regular status monitoring for fault detection |
| **Reverse Proxy** | Nginx | Hides backend topology from clients |
| **Stateless Authentication** | JWT tokens | No server-side session storage; auth info travels with the token |
| **Graceful Degradation** | Admin stats endpoint | System continues operating with reduced functionality on partial failure |
| **Sidecar (Docker Compose)** | DB containers alongside services | Each service runs with a companion database container |
| **Environment-based Config** | `.env` + `process.env` | Configuration externalized from code for portability |
| **Soft Delete** | Appointment cancellation | `DELETE` sets status to 'cancelled' instead of removing data — preserving audit trail |
| **RBAC (Role-Based Access Control)** | `middleware/auth.js` | Users, doctors, and admins have different permission levels |
| **CORS (Cross-Origin Resource Sharing)** | All services | Enables secure browser-to-API communication across origins |

### How a Request Flows Through the System

Let's trace a complete example — **a patient booking an appointment**:

```
  Step 1: Patient opens browser
  ───────────────────────────────────────────────────────────────
  Browser ──GET http://server/──> Nginx:80
                                    │
                                    └──> Serves index.html, CSS, JS
                                          (static files from /usr/share/nginx/html)

  Step 2: Patient logs in
  ───────────────────────────────────────────────────────────────
  Browser ──POST /api/auth/login──> Nginx:80
            {username, password}      │
                                      └──proxy_pass──> user-management-service:3002
                                                         │
                                                         ├── Query user-db (user-net)
                                                         ├── Verify bcrypt hash
                                                         ├── Generate JWT token
                                                         │
                                      <────────────────── Return {token, user}
  Browser stores JWT in localStorage

  Step 3: Patient fetches available doctors
  ───────────────────────────────────────────────────────────────
  Browser ──GET /api/doctors/──> Nginx:80
                                   │
                                   └──proxy_pass──> doctor-service:3005
                                                      │
                                                      ├── Query doctor-db (doctor-net)
                                                      │
                                   <───────────────── Return [{doctor1}, {doctor2}, ...]

  Step 4: Patient books an appointment
  ───────────────────────────────────────────────────────────────
  Browser ──POST /api/appointments/──> Nginx:80
            {patient_id, doctor_id,      │
             date, time, reason}         └──proxy_pass──> appointment-service:3001
                                                            │
                                                            ├── Validate required fields
                                                            ├── INSERT into appointment-db
                                                            │     (appointment-net)
                                                            │
                                         <────────────────── Return {appointmentId: 42}

  Step 5: Admin checks dashboard
  ───────────────────────────────────────────────────────────────
  Browser ──GET /api/admin/stats──> Nginx:80
                                      │
                                      └──proxy_pass──> admin-service:3009
                                                         │
                                                         ├── GET user-service/count/total
                                                         ├── GET doctor-service/count/total
                                                         ├── GET appointment-service/count/total
                                                         ├── ... (all 7 services)
                                                         │
                                      <───────────────── Return {users:10, doctors:5,
                                                                  appointments:42, ...}
```

> **Key observation:** At no point does any service directly access another service's database. All inter-service communication happens through HTTP APIs over the `gateway-net` Docker network.

---

## 🛠 Tech Stack

| Layer           | Technology                          |
|:----------------|:------------------------------------|
| **Runtime**     | Node.js + Express.js                |
| **Databases**   | MySQL 8.0 (one per service)         |
| **Auth**        | JWT (JSON Web Tokens) + bcrypt      |
| **API Gateway** | Nginx (reverse proxy)               |
| **Frontend**    | HTML5, CSS3, JavaScript, Bootstrap  |
| **Containers**  | Docker + Docker Compose             |
| **Networking**  | Isolated Docker bridge networks     |

---

## 🔬 Microservices

### 1. User Management Service

| Property | Value |
|:---------|:------|
| **Port** | `3002` |
| **Database** | `user_management_db` (MySQL 8.0) |
| **Container** | `user-management-service` |
| **DB Container** | `user-db` |
| **Network** | `user-net` + `gateway-net` |

#### Purpose
Handles **user registration, authentication, and profile management**. This is the authentication backbone of the entire platform — it issues **JWT tokens** that other services rely on for authorization.

#### Database Schema — `users`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `username` | VARCHAR(100) | NOT NULL, UNIQUE |
| `email` | VARCHAR(150) | NOT NULL, UNIQUE |
| `password` | VARCHAR(255) | NOT NULL (bcrypt hashed) |
| `full_name` | VARCHAR(200) | NOT NULL |
| `role` | ENUM('patient', 'doctor', 'admin') | DEFAULT 'patient' |
| `phone` | VARCHAR(20) | Nullable |
| `address` | TEXT | Nullable |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Key Features
- 🔐 **User Registration** with bcrypt password hashing
- 🔑 **Login** with JWT token generation (24h expiry)
- 🛡️ **Role-based Access Control** (patient / doctor / admin)
- 👤 **Profile CRUD** — view, update, delete users
- 🔢 **User count endpoint** for admin dashboard aggregation
- 🚫 Duplicate username/email detection (409 Conflict)

#### Dependencies
`express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`

---

### 2. Doctor Service

| Property | Value |
|:---------|:------|
| **Port** | `3005` |
| **Database** | `doctor_db` (MySQL 8.0) |
| **Container** | `doctor-service` |
| **DB Container** | `doctor-db` |
| **Network** | `doctor-net` + `gateway-net` |

#### Purpose
Manages the **doctor directory**, including profiles, specializations, and weekly availability schedules. Pre-seeded with 5 sample doctors across cardiology, neurology, pediatrics, orthopedics, and dermatology.

#### Database Schema — `doctors`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `user_id` | INT | Nullable (link to users table) |
| `full_name` | VARCHAR(200) | NOT NULL |
| `email` | VARCHAR(150) | Nullable |
| `phone` | VARCHAR(20) | Nullable |
| `specialization` | VARCHAR(100) | NOT NULL |
| `qualification` | VARCHAR(200) | Nullable |
| `experience_years` | INT | DEFAULT 0 |
| `consultation_fee` | DECIMAL(10,2) | DEFAULT 0.00 |
| `status` | ENUM('active', 'inactive') | DEFAULT 'active' |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Database Schema — `schedules`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `doctor_id` | INT | NOT NULL, FK → doctors(id) CASCADE |
| `day_of_week` | ENUM(Mon–Sun) | NOT NULL |
| `start_time` | TIME | NOT NULL |
| `end_time` | TIME | NOT NULL |
| `max_patients` | INT | DEFAULT 10 |

#### Key Features
- 📋 **CRUD** operations on doctor profiles
- 📅 **Schedule management** — add/view weekly availability per doctor
- 🏷️ **Specialization listing** — distinct active specializations
- 🔢 **Doctor count** for admin aggregation
- 🌱 **Seed data** — 5 doctors with 9 schedule entries

#### Dependencies
`express`, `mysql2`, `cors`

---

### 3. Registration Service

| Property | Value |
|:---------|:------|
| **Port** | `3004` |
| **Database** | `registration_db` (MySQL 8.0) |
| **Container** | `registration-service` |
| **DB Container** | `registration-db` |
| **Network** | `registration-net` + `gateway-net` |

#### Purpose
Manages **patient registrations with doctors**. Tracks which patient is registered under which doctor, along with reasons and status workflow.

#### Database Schema — `registrations`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `patient_id` | INT | NOT NULL |
| `patient_name` | VARCHAR(200) | NOT NULL |
| `doctor_id` | INT | NOT NULL |
| `doctor_name` | VARCHAR(200) | Nullable |
| `registration_date` | DATE | NOT NULL |
| `reason` | TEXT | Nullable |
| `status` | ENUM('registered', 'in-progress', 'completed', 'cancelled') | DEFAULT 'registered' |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Key Features
- 📝 **Create / View / Update / Delete** registrations
- 🔍 **Filter** by `patient_id` or `doctor_id` via query params
- 🔄 **Status workflow** — registered → in-progress → completed / cancelled
- 🔢 **Count endpoint** for admin

#### Dependencies
`express`, `mysql2`, `cors`

---

### 4. Appointment Service

| Property | Value |
|:---------|:------|
| **Port** | `3001` |
| **Database** | `appointment_db` (MySQL 8.0) |
| **Container** | `appointment-service` |
| **DB Container** | `appointment-db` |
| **Network** | `appointment-net` + `gateway-net` |

#### Purpose
Handles **appointment booking, scheduling, and lifecycle management** between patients and doctors. Supports date/time scheduling with a rich status lifecycle.

#### Database Schema — `appointments`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `patient_id` | INT | NOT NULL |
| `patient_name` | VARCHAR(200) | NOT NULL |
| `doctor_id` | INT | NOT NULL |
| `doctor_name` | VARCHAR(200) | Nullable |
| `appointment_date` | DATE | NOT NULL |
| `appointment_time` | TIME | NOT NULL |
| `reason` | TEXT | Nullable |
| `status` | ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show') | DEFAULT 'scheduled' |
| `notes` | TEXT | Nullable |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Key Features
- 📅 **Book appointments** with date + time
- 🔍 **Filter** by `patient_id`, `doctor_id`, or `status`
- 🔄 **Lifecycle management** — scheduled → confirmed → completed / cancelled / no-show
- ❌ **Soft-cancel** — DELETE sets status to 'cancelled' instead of removing data
- 🔢 **Count endpoint** for admin

#### Dependencies
`express`, `mysql2`, `cors`

---

### 5. Vital Sign Service

| Property | Value |
|:---------|:------|
| **Port** | `3003` |
| **Database** | `vital_sign_db` (MySQL 8.0) |
| **Container** | `vital-sign-service` |
| **DB Container** | `vital-db` |
| **Network** | `vital-net` + `gateway-net` |

#### Purpose
Records and manages **patient vital signs** — a comprehensive health metrics tracker covering blood pressure, heart rate, temperature, SpO₂, weight, height, and blood sugar.

#### Database Schema — `vital_signs`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `patient_id` | INT | NOT NULL |
| `patient_name` | VARCHAR(200) | Nullable |
| `user_id` | INT | Nullable |
| `blood_pressure_systolic` | INT | Nullable |
| `blood_pressure_diastolic` | INT | Nullable |
| `heart_rate` | INT | Nullable |
| `temperature` | DECIMAL(4,1) | Nullable |
| `respiratory_rate` | INT | Nullable |
| `oxygen_saturation` | DECIMAL(4,1) | Nullable |
| `weight` | DECIMAL(5,1) | Nullable |
| `height` | DECIMAL(5,1) | Nullable |
| `blood_sugar` | DECIMAL(6,1) | Nullable |
| `notes` | TEXT | Nullable |
| `recorded_at` | TIMESTAMP | Auto-generated |
| `created_at` | TIMESTAMP | Auto-generated |

#### Key Features
- 🩺 **Record vital signs** — BP, heart rate, temperature, SpO₂, respiratory rate, blood sugar, weight, height
- 📊 **Filter by patient** — chronological vital history per patient
- ✏️ **Dynamic updates** — update only specific fields without overwriting others
- 🔢 **Count endpoint** for admin

#### Dependencies
`express`, `mysql2`, `cors`

---

### 6. Forum Service

| Property | Value |
|:---------|:------|
| **Port** | `3007` |
| **Database** | `forum_db` (MySQL 8.0) |
| **Container** | `forum-service` |
| **DB Container** | `forum-db` |
| **Network** | `forum-net` + `gateway-net` |

#### Purpose
A **community discussion forum** for patients and healthcare providers. Supports posts with categorization, likes, and threaded comments.

#### Database Schema — `posts`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `user_id` | INT | NOT NULL |
| `author_name` | VARCHAR(200) | NOT NULL |
| `title` | VARCHAR(300) | NOT NULL |
| `content` | TEXT | NOT NULL |
| `category` | ENUM('general', 'health-tips', 'news', 'question', 'announcement') | DEFAULT 'general' |
| `likes_count` | INT | DEFAULT 0 |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Database Schema — `comments`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `post_id` | INT | NOT NULL, FK → posts(id) CASCADE |
| `user_id` | INT | NOT NULL |
| `author_name` | VARCHAR(200) | NOT NULL |
| `content` | TEXT | NOT NULL |
| `created_at` | TIMESTAMP | Auto-generated |

#### Key Features
- 📝 **Create / Read / Update / Delete** posts
- 🏷️ **Category filtering** — general, health-tips, news, question, announcement
- ❤️ **Like system** — increment likes on posts
- 💬 **Threaded comments** — add and view comments per post
- 🔗 **Post + comments** in a single response when fetching by ID
- 🔢 **Count endpoint** for admin

#### Dependencies
`express`, `mysql2`, `cors`

---

### 7. Complaint Service

| Property | Value |
|:---------|:------|
| **Port** | `3008` |
| **Database** | `complaint_db` (MySQL 8.0) |
| **Container** | `complaint-service` |
| **DB Container** | `complaint-db` |
| **Network** | `complaint-net` + `gateway-net` |

#### Purpose
A **complaint and grievance management system**. Patients can file complaints categorized by type and priority, and administrators can track, resolve, and close them.

#### Database Schema — `complaints`

| Column | Type | Constraints |
|:-------|:-----|:------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT |
| `user_id` | INT | NOT NULL |
| `user_name` | VARCHAR(200) | NOT NULL |
| `subject` | VARCHAR(300) | NOT NULL |
| `description` | TEXT | NOT NULL |
| `category` | ENUM('service', 'staff', 'facility', 'billing', 'other') | DEFAULT 'other' |
| `priority` | ENUM('low', 'medium', 'high', 'critical') | DEFAULT 'medium' |
| `status` | ENUM('open', 'in-progress', 'resolved', 'closed') | DEFAULT 'open' |
| `resolution` | TEXT | Nullable |
| `created_at` | TIMESTAMP | Auto-generated |
| `updated_at` | TIMESTAMP | Auto-updated |

#### Key Features
- 🗣️ **Submit complaints** with subject, description, category, and priority
- 🔍 **Filter** by `user_id`, `status`, or `priority`
- 🔄 **Status workflow** — open → in-progress → resolved → closed
- 📝 **Resolution tracking** — admin can add resolution text
- 🔢 **Count endpoint** for admin

#### Dependencies
`express`, `mysql2`, `cors`

---

### 8. Admin Service

| Property | Value |
|:---------|:------|
| **Port** | `3009` |
| **Database** | **None** (stateless aggregator) |
| **Container** | `admin-service` |
| **Network** | `gateway-net` only |

#### Purpose
An **aggregation and monitoring service** that communicates with all other microservices to provide a **unified admin dashboard** with statistics and health checks. It has **no database of its own** — it calls other services' `/count/total` and `/health` endpoints.

#### Key Features
- 📊 **Aggregate statistics** — fetches user, doctor, appointment, registration, vital, post, and complaint counts from all services via `Promise.allSettled`
- 🩺 **System health check** — pings all 7 services and reports their up/down status
- 🛡️ **Graceful degradation** — uses `Promise.allSettled` so one failing service doesn't break the entire stats response

#### Internal Service URLs

| Service | Internal URL |
|:--------|:-------------|
| Users | `http://user-management-service:3002` |
| Doctors | `http://doctor-service:3005` |
| Appointments | `http://appointment-service:3001` |
| Registrations | `http://registration-service:3004` |
| Vitals | `http://vital-sign-service:3003` |
| Forum | `http://forum-service:3007` |
| Complaints | `http://complaint-service:3008` |

#### Dependencies
`express`, `cors`, `jsonwebtoken`, `axios`

---

## 🌐 Frontend & API Gateway

| Property | Value |
|:---------|:------|
| **Port** | `80` |
| **Web Server** | Nginx (Alpine) |
| **Container** | `frontend` |
| **Network** | `gateway-net` |

The frontend is a **single-page application** built with HTML5, CSS3, JavaScript, and Bootstrap. It's served through Nginx, which simultaneously acts as the **API Gateway / Reverse Proxy**, routing all `/api/*` requests to the appropriate microservice.

#### Nginx Route Mapping

| Route Pattern | Upstream Service |
|:--------------|:-----------------|
| `/` | Static files (`index.html`, CSS, JS) |
| `/api/auth/*` | `user-management-service:3002` |
| `/api/users/*` | `user-management-service:3002` |
| `/api/doctors/*` | `doctor-service:3005` |
| `/api/registrations/*` | `registration-service:3004` |
| `/api/appointments/*` | `appointment-service:3001` |
| `/api/vitals/*` | `vital-sign-service:3003` |
| `/api/posts/*` | `forum-service:3007` |
| `/api/complaints/*` | `complaint-service:3008` |
| `/api/admin/*` | `admin-service:3009` |

All proxy routes forward `Host`, `X-Real-IP`, and `X-Forwarded-For` headers for proper client identification.

---

## 🔌 Port Mapping Reference

| Service | Host Port | Container Port | Purpose |
|:--------|:---------:|:--------------:|:--------|
| **Frontend / Nginx** | `80` | `80` | Web UI + API Gateway |
| **Appointment Service** | `3001` | `3001` | Appointment management |
| **User Management Service** | `3002` | `3002` | Auth & user profiles |
| **Vital Sign Service** | `3003` | `3003` | Patient vitals tracking |
| **Registration Service** | `3004` | `3004` | Patient-doctor registrations |
| **Doctor Service** | `3005` | `3005` | Doctor profiles & schedules |
| **Forum Service** | `3007` | `3007` | Community discussion board |
| **Complaint Service** | `3008` | `3008` | Grievance management |
| **Admin Service** | `3009` | `3009` | Dashboard aggregation |

> **Note:** MySQL databases are **not** exposed to the host — they are only reachable within their respective isolated Docker networks.

---

## 🗄 Database Architecture

Each microservice owns its own MySQL 8.0 instance with a **dedicated database**, following the **Database-per-Service** pattern:

| Service | Database Name | Container | Volume | Tables |
|:--------|:-------------|:----------|:-------|:-------|
| User Management | `user_management_db` | `user-db` | `user-db-data` | `users` |
| Doctor | `doctor_db` | `doctor-db` | `doctor-db-data` | `doctors`, `schedules` |
| Registration | `registration_db` | `registration-db` | `registration-db-data` | `registrations` |
| Appointment | `appointment_db` | `appointment-db` | `appointment-db-data` | `appointments` |
| Vital Sign | `vital_sign_db` | `vital-db` | `vital-db-data` | `vital_signs` |
| Forum | `forum_db` | `forum-db` | `forum-db-data` | `posts`, `comments` |
| Complaint | `complaint_db` | `complaint-db` | `complaint-db-data` | `complaints` |
| Admin | — | — | — | *(no database)* |

- All databases use `healthcare_root_2024` as the root password (configurable via `.env`)
- Each database container includes a health check (`mysqladmin ping`) with 15s intervals
- Initialization scripts (`init.sql`) auto-create schemas and seed data on first startup
- Persistent Docker volumes ensure data survives container restarts

---

## 🔗 Docker Network Topology

```
┌───────────────────────────────────────────────────────────────────┐
│                         gateway-net                               │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ frontend │  │  admin   │  │  user    │  │  doctor  │  ...    │
│  │  (nginx) │  │ service  │  │ service  │  │ service  │         │
│  └──────────┘  └──────────┘  └────┬─────┘  └────┬─────┘         │
│                                    │              │               │
└────────────────────────────────────┼──────────────┼───────────────┘
                                     │              │
                              ┌──────┴──────┐ ┌─────┴──────┐
                              │  user-net   │ │ doctor-net │
                              │  ┌───────┐  │ │  ┌───────┐ │
                              │  │user-db│  │ │  │doc-db │ │
                              │  └───────┘  │ │  └───────┘ │
                              └─────────────┘ └────────────┘
                                    ...  (same pattern for all)
```

**9 networks total:** 1 shared `gateway-net` + 7 isolated service networks. Each database is only reachable by its owning microservice — never directly from the frontend or other services.

---

## 📡 API Reference

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `POST` | `/api/auth/register` | ❌ | Register a new user |
| `POST` | `/api/auth/login` | ❌ | Login and receive JWT |

### Users (`/api/users`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/users/` | 🔒 Admin | List all users |
| `GET` | `/api/users/:id` | 🔒 Token | Get user by ID |
| `PUT` | `/api/users/:id` | 🔒 Owner/Admin | Update user profile |
| `DELETE` | `/api/users/:id` | 🔒 Admin | Delete a user |
| `GET` | `/api/users/count/total` | ❌ | Get total user count |

### Doctors (`/api/doctors`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/doctors/` | ❌ | List all active doctors |
| `GET` | `/api/doctors/:id` | ❌ | Get doctor by ID |
| `POST` | `/api/doctors/` | ❌ | Create a doctor profile |
| `PUT` | `/api/doctors/:id` | ❌ | Update doctor details |
| `DELETE` | `/api/doctors/:id` | ❌ | Delete a doctor |
| `GET` | `/api/doctors/:id/schedule` | ❌ | Get doctor's weekly schedule |
| `POST` | `/api/doctors/:id/schedule` | ❌ | Add a schedule entry |
| `GET` | `/api/doctors/specializations/list` | ❌ | List unique specializations |
| `GET` | `/api/doctors/count/total` | ❌ | Get total doctor count |

### Registrations (`/api/registrations`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/registrations/` | ❌ | List all (filter by `patient_id` or `doctor_id`) |
| `GET` | `/api/registrations/:id` | ❌ | Get a registration |
| `POST` | `/api/registrations/` | ❌ | Create a registration |
| `PUT` | `/api/registrations/:id` | ❌ | Update status/notes |
| `DELETE` | `/api/registrations/:id` | ❌ | Delete a registration |
| `GET` | `/api/registrations/count/total` | ❌ | Get total registration count |

### Appointments (`/api/appointments`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/appointments/` | ❌ | List all (filter by `patient_id`, `doctor_id`, `status`) |
| `GET` | `/api/appointments/:id` | ❌ | Get appointment by ID |
| `POST` | `/api/appointments/` | ❌ | Book an appointment |
| `PUT` | `/api/appointments/:id` | ❌ | Update appointment |
| `DELETE` | `/api/appointments/:id` | ❌ | Cancel (soft-delete) |
| `GET` | `/api/appointments/count/total` | ❌ | Get total appointment count |

### Vital Signs (`/api/vitals`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/vitals/` | ❌ | List all (filter by `patient_id`) |
| `GET` | `/api/vitals/:id` | ❌ | Get vital record by ID |
| `POST` | `/api/vitals/` | ❌ | Record new vital signs |
| `PUT` | `/api/vitals/:id` | ❌ | Update vital record |
| `DELETE` | `/api/vitals/:id` | ❌ | Delete vital record |
| `GET` | `/api/vitals/count/total` | ❌ | Get total vitals count |

### Forum Posts (`/api/posts`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/posts/` | ❌ | List all posts (filter by `category`) |
| `GET` | `/api/posts/:id` | ❌ | Get post with comments |
| `POST` | `/api/posts/` | ❌ | Create a post |
| `PUT` | `/api/posts/:id` | ❌ | Update a post |
| `DELETE` | `/api/posts/:id` | ❌ | Delete a post |
| `POST` | `/api/posts/:id/like` | ❌ | Like a post |
| `GET` | `/api/posts/:id/comments` | ❌ | List comments on a post |
| `POST` | `/api/posts/:id/comments` | ❌ | Add a comment |
| `GET` | `/api/posts/count/total` | ❌ | Get total post count |

### Complaints (`/api/complaints`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/complaints/` | ❌ | List all (filter by `user_id`, `status`, `priority`) |
| `GET` | `/api/complaints/:id` | ❌ | Get complaint by ID |
| `POST` | `/api/complaints/` | ❌ | Submit a complaint |
| `PUT` | `/api/complaints/:id` | ❌ | Update status/resolution |
| `DELETE` | `/api/complaints/:id` | ❌ | Delete a complaint |
| `GET` | `/api/complaints/count/total` | ❌ | Get total complaint count |

### Admin (`/api/admin`)

| Method | Endpoint | Auth | Description |
|:-------|:---------|:-----|:------------|
| `GET` | `/api/admin/stats` | ❌ | Aggregated counts from all services |
| `GET` | `/api/admin/health` | ❌ | Health status of all services |

---

## 🚀 Getting Started

### Prerequisites

- **Docker** ≥ 20.x
- **Docker Compose** ≥ 2.x

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/<YOUR_USERNAME>/HealthCareApp.git
cd HealthCareApp

# 2. Review environment variables
cat .env

# 3. Build and start all services
docker compose build
docker compose up -d

# 4. Wait ~60 seconds for MySQL databases to initialize

# 5. Verify all containers are running
docker compose ps

# 6. Open in browser
# http://localhost
```

> 🕐 **First startup** takes 2–3 minutes as MySQL initializes databases and runs `init.sql` seed scripts.

---

## ⚙ Environment Variables

Defined in `.env` at the project root:

| Variable | Default Value | Description |
|:---------|:-------------|:------------|
| `MYSQL_ROOT_PASSWORD` | `healthcare_root_2024` | Root password for all MySQL instances |
| `JWT_SECRET` | `healthcare_jwt_super_secret_key_2024` | Secret key for JWT signing |
| `NODE_ENV` | `production` | Node.js environment mode |

> ⚠️ **For production deployments**, always change the default passwords and JWT secret to strong, random values.

---

## 🔑 Default Credentials

| Role | Username | Password |
|:-----|:---------|:---------|
| **Admin** | `admin` | `admin123` |

The admin user is automatically seeded during the first database initialization via `user-management-service/init.sql`.

---

## ☁ Deployment on EC2

See the full deployment guide: [**EC2_DEPLOYMENT.md**](./EC2_DEPLOYMENT.md)

**Quick summary:**

1. Launch an **Ubuntu 22.04 LTS** EC2 instance (t2.medium or larger)
2. Open inbound ports **80** (HTTP) and **22** (SSH) in Security Groups
3. Install Docker & Docker Compose
4. Clone/upload the project
5. Run `docker compose build && docker compose up -d`
6. Access via `http://<EC2_PUBLIC_IP>`

---

## 🐳 Useful Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove all data (⚠️ destructive!)
docker compose down -v

# Rebuild a specific service
docker compose build <service-name>
docker compose up -d <service-name>

# View all logs
docker compose logs -f

# View logs for a specific service
docker compose logs -f user-management-service

# Check container resource usage
docker stats

# Restart all services
docker compose restart

# Check health of services
curl http://localhost/api/admin/health
```

---

## 🔧 Troubleshooting

| Problem | Solution |
|:--------|:---------|
| Container won't start | Run `docker compose logs <service-name>` to check errors |
| Database connection refused | MySQL takes ~30–60s to initialize on first start. Wait and retry. |
| Port 80 already in use | Run `sudo lsof -i :80` and stop any conflicting process |
| "Cannot connect to MySQL" | Verify MySQL container is healthy: `docker compose ps` |
| JWT authentication fails | Ensure `JWT_SECRET` matches in `.env` across all environments |
| Service returns 502 Bad Gateway | The upstream service hasn't started yet — check its logs |

---

## 📁 Project Structure

```
HealthCareApp/
├── .env                          # Environment variables
├── .dockerignore                 # Docker ignore rules
├── docker-compose.yml            # Multi-service orchestration
├── EC2_DEPLOYMENT.md             # AWS EC2 deployment guide
├── README.md                     # This file
│
├── frontend/                     # Nginx + Static Web UI
│   ├── Dockerfile                # nginx:alpine image
│   ├── nginx.conf                # Reverse proxy configuration
│   └── html/
│       ├── index.html            # SPA entry point
│       ├── css/style.css         # Stylesheet
│       └── js/app.js             # Frontend logic
│
├── user-management-service/      # Auth & User Profiles (port 3002)
│   ├── Dockerfile
│   ├── app.js                    # Express server entry
│   ├── db.js                     # MySQL connection pool
│   ├── init.sql                  # Schema + admin seed
│   ├── package.json
│   ├── middleware/auth.js        # JWT auth & RBAC middleware
│   └── routes/
│       ├── auth.js               # /api/auth (register, login)
│       └── users.js              # /api/users (CRUD, count)
│
├── doctor-service/               # Doctor Profiles (port 3005)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql                  # Schema + 5 doctor seeds
│   ├── package.json
│   └── routes/doctors.js         # /api/doctors (CRUD, schedule, specs)
│
├── registration-service/         # Patient Registrations (port 3004)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   └── routes/registrations.js   # /api/registrations (CRUD, filter)
│
├── appointment-service/          # Appointment Booking (port 3001)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   └── routes/appointments.js    # /api/appointments (CRUD, filter)
│
├── vital-sign-service/           # Vital Signs Tracking (port 3003)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   └── routes/vitals.js          # /api/vitals (CRUD, filter)
│
├── forum-service/                # Community Forum (port 3007)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   └── routes/posts.js           # /api/posts (CRUD, likes, comments)
│
├── complaint-service/            # Complaint Management (port 3008)
│   ├── Dockerfile
│   ├── app.js
│   ├── db.js
│   ├── init.sql
│   ├── package.json
│   └── routes/complaints.js      # /api/complaints (CRUD, filter)
│
└── admin-service/                # Admin Aggregation (port 3009)
    ├── Dockerfile
    ├── app.js
    ├── package.json
    └── routes/admin.js           # /api/admin (stats, health)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

<p align="center">
  Made with ❤️ for better healthcare management
</p>
