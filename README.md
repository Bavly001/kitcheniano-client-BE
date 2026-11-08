# 🍽️ Kitcheniano — Customer Storefront API Microservice (Backend)

> High-performance Express 4 and TypeScript backend microservice powering the Kitcheniano customer-facing food ordering storefront. Manages customer authentication, menu retrieval, order submission, and real-time SSE order tracking on TiDB Cloud Serverless MySQL.

[![Client API Microservice](https://img.shields.io/badge/Client_API-Render-46E3B7?style=for-the-badge&logo=render)](https://kitcheniano-client-be.onrender.com)
[![Live Customer Storefront](https://img.shields.io/badge/Live_Storefront-Vercel-black?style=for-the-badge&logo=vercel)](https://kitcheniano-client-fe.vercel.app/)
[![Kitchen Operations Dashboard](https://img.shields.io/badge/Kitchen_Dashboard-Vercel-black?style=for-the-badge&logo=vercel)](https://kitcheniano-dashboard-fe.vercel.app/)
[![Express.js](https://img.shields.io/badge/Framework-Express_4-black?style=for-the-badge&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript_5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Database-TiDB_Cloud_MySQL-orange?style=for-the-badge&logo=mysql)](https://tidbcloud.com/)

---

## 🌐 Live Deployments & Preview

- **Production API Base URL:** [https://kitcheniano-client-be.onrender.com](https://kitcheniano-client-be.onrender.com)
- **Health Check Endpoint:** [https://kitcheniano-client-be.onrender.com/api/health](https://kitcheniano-client-be.onrender.com/api/health)
- **Customer Storefront UI:** [https://kitcheniano-client-fe.vercel.app/](https://kitcheniano-client-fe.vercel.app/)
- **Operations Dashboard UI:** [https://kitcheniano-dashboard-fe.vercel.app/](https://kitcheniano-dashboard-fe.vercel.app/)
- **Source Repositories:**
  - Frontend: [https://github.com/Bavly001/kitcheniano-client-FE](https://github.com/Bavly001/kitcheniano-client-FE)
  - Backend: [https://github.com/Bavly001/kitcheniano-client-BE](https://github.com/Bavly001/kitcheniano-client-BE)

---

## 🏗 Microservices Architecture Role

The customer storefront microservice is purposely decoupled from the internal kitchen management backend:
1. **Lightweight & High-Throughput:** Built with Express 4 and MySQL2 connection pools to handle high-concurrency public traffic (menu browsing, customer logins, and cart operations) without impacting kitchen back-office operations.
2. **Shared Relational Persistence:** Directly accesses the shared TiDB Cloud MySQL database (`menu_items`, `orders`, `order_items`, `clients`, `incomes`) under organization-level partitioning.
3. **Real-Time Kitchen Bridge:** On order creation, dispatches event hooks to the Kitchen Operations Dashboard backend (`https://kitcheniano-dashboard-be.onrender.com`), instantly triggering SSE audio chimes on kitchen display screens.
4. **Customer Live Order Stream:** Provides Server-Sent Events (SSE) at `GET /api/orders/:id/stream` for live customer status updates.

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Service health and database ping | Public |
| `POST` | `/api/auth/register` | Customer account registration | Public |
| `POST` | `/api/auth/login` | Customer JWT authentication | Public |
| `GET` | `/api/auth/me` | Current authenticated customer profile | Bearer JWT |
| `GET` | `/api/menu` | Public active dishes with categories and pricing | Public |
| `POST` | `/api/orders` | Submit new customer order (delivery or pickup) | Optional Auth |
| `GET` | `/api/orders/:id` | Fetch specific order details and items | Public |
| `GET` | `/api/orders/:id/stream` | Server-Sent Events (SSE) live status stream | Public |
| `GET` | `/api/orders/user/my-orders`| Fetch order history for authenticated customer | Bearer JWT |

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js 18+ or 20+
- Access to MySQL or TiDB Cloud Serverless instance

### 2. Environment Variables
Create a `.env` file in the root of `kitcheniano-client-BE`:
```env
PORT=4001
NODE_ENV=development

# Multi-tenant Default Organization (Kitcheniano Downtown)
DEFAULT_ORG_ID=org_8492a158b

# MySQL Database (Shared TiDB Cloud Database)
DB_HOST=gateway01.eu-central-1.prod.aws.tidbcloud.com
DB_PORT=4000
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=kitcheniano_db
DB_SSL=true

# Customer Authentication JWT Secret
JWT_SECRET=your_jwt_secret

# Bridge to Dashboard Backend (Order Real-Time Sync)
KITCHEN_DASHBOARD_URL=https://kitcheniano-dashboard-be.onrender.com
```

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Build & Run Tests
```bash
npm run build
npm test
```

---

## 🐳 Docker Deployment

Build and run container:
```bash
docker build -t kitcheniano-client-be .
docker run -p 4001:4001 --env-file .env kitcheniano-client-be
```
