# ⚡ DevOps Pulse Dashboard

> Enterprise-grade CI/CD monitoring platform for Jenkins, Docker, AWS & microservices.

![DevOps Pulse](https://img.shields.io/badge/DevOps-Pulse-00d4ff?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646cff?style=for-the-badge&logo=vite)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker & Docker Compose (for containerized deployment)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start dev server
npm run dev
```

Visit: http://localhost:3000

**Demo credentials:** `admin@devops.io` / `admin123`

---

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Stop services
docker-compose down
```

---

## 🏗️ Production Build

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
devops-pulse/
├── src/
│   ├── App.jsx          # Main application (all pages & components)
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS config
├── postcss.config.js    # PostCSS config
├── Dockerfile           # Multi-stage Docker build
├── docker-compose.yml   # Full stack orchestration
├── nginx.conf           # Nginx SPA config
├── .env.example         # Environment template
└── README.md
```

---

## 🧩 Features

| Feature | Status |
|---|---|
| Login / Signup (JWT) | ✅ |
| CI/CD Pipeline Monitoring | ✅ |
| Pipeline Stage Visualization | ✅ |
| Docker Container Management | ✅ |
| AWS EC2 Monitoring | ✅ |
| Microservices Health | ✅ |
| Real-time Log Viewer | ✅ |
| Analytics Charts (Recharts) | ✅ |
| Notification System | ✅ |
| Settings & Config | ✅ |
| Collapsible Sidebar | ✅ |
| Dark DevOps Theme | ✅ |
| Framer Motion Animations | ✅ |
| Responsive Layout | ✅ |

---

## 🔧 Jenkins Integration

1. Go to **Settings → Jenkins Configuration**
2. Enter your Jenkins URL (e.g., `http://jenkins.internal:8080`)
3. Generate an API token: **Jenkins → User → Configure → API Token**
4. Paste token and username, click Save

---

## ☁️ AWS Integration

1. Create an IAM user with `ReadOnlyAccess` policy
2. Go to **Settings → AWS Configuration**
3. Enter Access Key ID, Secret, and Region

---

## 📜 License

MIT © DevOps Pulse
