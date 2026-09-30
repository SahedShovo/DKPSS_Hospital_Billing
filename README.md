# DKPSSHP Hospital Billing System

A hospital operations and billing application for managing patients, doctors, diagnostic tests, service packages, admissions, bills, payments, expenses, and audit logs. It includes role-based access, paginated lists, reports, date-based exports, and printable invoices.

## Project structure

- `hospital-billing-frontend/` — Next.js, React, and TypeScript user interface.
- `hospital-billing-backend/` — NestJS REST API with PostgreSQL and Drizzle ORM.

## Configuration

Create local environment files; do not commit them. Configure the backend with `DATABASE_URL`, a strong `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, and `INITIAL_ADMIN_PASSWORD` (at least 12 characters). Optionally set `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_NAME`. Configure the frontend with `NEXT_PUBLIC_API_URL`, pointing to the deployed backend API.

## Local development

Install dependencies in each application directory with `npm install`. Start the API with `npm run start:dev` from the backend directory and start the UI with `npm run dev` from the frontend directory. The frontend runs on port 3000 by default; the backend uses the configured `PORT` (4002 by default).

Before deployment, provision PostgreSQL, configure environment variables on the hosting services, and apply the database schema. Keep credentials and environment files private.
