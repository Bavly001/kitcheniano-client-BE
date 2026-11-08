# 🍽️ Kitcheniano Client Backend Microservice (`kitcheniano-client-BE`)

## 1. Overview
A lean, modular Express + TypeScript microservice running on port 4001, providing customer-facing APIs for the Kitcheniano platform. It connects directly to the shared `kitcheniano_db` MySQL 8 database, operating under least-privilege scoping to serve public dishes, manage client authentication, persist customer shopping carts, and accept online orders with real-time SSE updates.

## 2. Architecture & Design Principles
- **Simple & Modular:** Mirrors the architecture of `todo-list-app-BE` with clear separation of routes, middleware, and connection pooling.
- **Shared Relational Storage:** Connects to `kitcheniano_db` via `mysql2/promise` connection pooling, sharing `menu_items`, `clients`, `orders`, and `order_items` without duplicating tables.
- **Least-Privilege Boundary:** Only dishes with `isVisibleOnMenu = 1 AND isActive = 1` are accessible. Internal raw ingredients (`products`), stock batches (`inventory_batches`), recipe formulas, staff accounts (`users`), and financial records (`incomes`) are completely concealed from public clients.
- **Authoritative Price Snapshotting:** When placing orders, prices and dish names are snapshotted directly from MySQL `menu_items` into `order_items` to prevent client tampering.
- **Real-Time Live Order Stream:** Provides an SSE endpoint (`/client/notifications/stream`) streaming order preparation status transitions directly to connected customers.

## 3. Tech Stack
- **Runtime:** Node.js 20+
- **Framework:** Express 4.x
- **Language:** TypeScript 5.x
- **Database Driver:** `mysql2/promise` (connection pooling)
- **Security:** bcryptjs (password hashing), jsonwebtoken (7-day client JWT), CORS
- **Testing:** Jest + Supertest (10 integration test suites)
- **Containerization:** Multi-stage Dockerfile (Node 20 Alpine)

## 4. Endpoints Summary
- **Authentication:** `POST /client/auth/register`, `POST /client/auth/login`, `GET /client/auth/me`
- **Public Menu:** `GET /client/menu`, `GET /client/menu/:id`
- **Persistent Cart:** `GET /client/cart`, `PUT /client/cart`, `DELETE /client/cart`
- **Orders & Tracking:** `POST /client/orders`, `GET /client/orders`, `GET /client/orders/:id`
- **Real-Time SSE:** `GET /client/notifications/stream?token=...`, `POST /client/notifications/webhook`
