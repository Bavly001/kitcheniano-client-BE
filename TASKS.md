# 📋 Kitcheniano Client Backend Tasks & Progress (`TASKS.md`)

## Completed Milestones
- [x] Scaffolded modular Express + TypeScript project structure matching `todo-list-app-BE`
- [x] Configured `mysql2/promise` connection pool to shared `kitcheniano_db` MySQL 8 container
- [x] Implemented database initialization verifying required tables (`clients`, `client_carts`, `menu_items`, `orders`, `order_items`)
- [x] Built customer authentication routes (`/client/auth/register`, `/client/auth/login`, `/client/auth/me`) with bcrypt and JWT
- [x] Built public menu catalog (`/client/menu`, `/client/menu/:id`) strictly scoped to visible active dishes
- [x] Built persistent cloud cart module (`/client/cart` GET, PUT, DELETE) linked to `client_carts` table
- [x] Implemented order placement (`POST /client/orders`) with database price snapshotting, cart clearance, and kitchen alert webhook
- [x] Implemented order history (`GET /client/orders`) and live tracking query (`GET /client/orders/:id`)
- [x] Built real-time Server-Sent Events stream (`GET /client/notifications/stream`) with keepalive heartbeats
- [x] Wrote comprehensive integration test suite (`tests/api.test.ts`) covering all 10 API endpoints (10/10 tests passing)
- [x] Configured multi-stage Alpine Dockerfile and added service to root `docker-compose.yml` (port 4001)

## Decisions Log
- **2026-11-08:** Adopted a simple Express + TypeScript microservice pattern matching `todo-list-app-BE` for maximum development speed and zero unnecessary framework overhead.
- **2026-11-08:** Leveraged `mysql2/promise` connection pooling directly against `kitcheniano_db` on port 3306, avoiding duplicate schema maintenance while preserving tenant organization scoping (`organizationId`).
- **2026-11-08:** Enforced authoritative price snapshotting on backend: prices submitted by client requests are ignored; exact dish prices are fetched directly from `menu_items` and snapshotted into `order_items`.
