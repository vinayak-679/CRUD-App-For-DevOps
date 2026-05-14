# Task Manager — Full-Stack CRUD Application

A simple, production-style Task Management application built for **DevOps deployment practice** — Dockerization, CI/CD, Kubernetes, and infrastructure automation.

## Tech Stack

| Layer      | Technology               |
|------------|--------------------------|
| Frontend   | Angular 21               |
| Backend    | Node.js + Express        |
| Database   | MongoDB + Mongoose       |
| Auth       | JWT (JSON Web Tokens)    |

## Project Structure

```
project-root/
├── frontend/          # Angular application (port 4200)
├── backend/           # Node.js + Express API (port 3001)
└── README.md
```

## Prerequisites

- **Node.js** (v18+)
- **npm** (v9+)
- **MongoDB** (v6+ running locally or accessible via URI)
- **Angular CLI** (installed globally or use `npx`)

## Quick Start

### 1. Clone & Setup Backend

```bash
cd backend
cp .env.example .env    # Edit .env with your MongoDB URI and JWT secret
npm install
npm start               # Starts on http://localhost:3001
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npx ng serve            # Starts on http://localhost:4200
```

### 3. Access the App

Open `http://localhost:4200` in your browser.

**Default credentials:** `admin` / `admin123`

## Environment Variables

### Backend (`.env`)

| Variable      | Description              | Default                                  |
|---------------|--------------------------|------------------------------------------|
| `PORT`        | Server port              | `3001`                                   |
| `MONGODB_URI` | MongoDB connection URI   | `mongodb://localhost:27017/taskmanager`   |
| `JWT_SECRET`  | Secret key for JWT       | `your_jwt_secret_here`                   |

### Frontend (`src/environments/environment.ts`)

| Variable    | Description       | Default                       |
|-------------|-------------------|-------------------------------|
| `apiUrl`    | Backend API URL   | `http://localhost:3001/api`   |

## API Endpoints

| Method   | Endpoint            | Auth | Description       |
|----------|---------------------|------|-------------------|
| `GET`    | `/health`           | No   | Health check      |
| `POST`   | `/api/auth/login`   | No   | Login             |
| `GET`    | `/api/tasks`        | Yes  | List all tasks    |
| `POST`   | `/api/tasks`        | Yes  | Create a task     |
| `GET`    | `/api/tasks/:id`    | Yes  | Get single task   |
| `PUT`    | `/api/tasks/:id`    | Yes  | Update a task     |
| `DELETE` | `/api/tasks/:id`    | Yes  | Delete a task     |

## Docker Ready

This project is structured for Docker Compose deployment:

- Frontend and backend run as **independent services**
- Backend port: **3001**, Frontend port: **4200**
- API URLs are **configurable via environment variables**
- MongoDB connection via `MONGODB_URI` environment variable

## Features

- ✅ JWT authentication (login/logout)
- ✅ Task CRUD (Create, Read, Update, Delete)
- ✅ Task status tracking (Pending, In Progress, Completed)
- ✅ Dashboard with task statistics
- ✅ Responsive UI
- ✅ Health check endpoint
- ✅ Request logging (Morgan)
- ✅ Centralized error handling
- ✅ Auto-seeded default user
