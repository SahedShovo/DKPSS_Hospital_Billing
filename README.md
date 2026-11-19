# DKPSSHP Hospital Billing System

A hospital operations and billing application for managing patients, doctors, diagnostic tests, service packages, admissions, bills, payments, expenses, and audit logs. It includes role-based access, paginated lists, reports, date-based exports, and printable invoices.

বাংলা ব্যবহার নির্দেশিকার জন্য [docs/PROJECT_GUIDE_BN.md](docs/PROJECT_GUIDE_BN.md), পূর্ণাঙ্গ project report-এর জন্য [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md), এবং RStudio-তে HTML report তৈরি করতে [docs/PROJECT_REPORT.Rmd](docs/PROJECT_REPORT.Rmd) দেখুন।

## Project structure

- `hospital-billing-frontend/` — Next.js, React, and TypeScript user interface.
- `hospital-billing-backend/` — NestJS REST API with PostgreSQL and Drizzle ORM.

## Configuration

Create local environment files; do not commit them. Configure the backend with `DATABASE_URL`, a strong `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`, and `INITIAL_ADMIN_PASSWORD` (at least 12 characters). Optionally set `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_NAME`. Configure the frontend with `NEXT_PUBLIC_API_URL`, pointing to the deployed backend API.

## Local development

Install dependencies in each application directory with `npm install`. Start the API with `npm run start:dev` from the backend directory and start the UI with `npm run dev` from the frontend directory. The frontend runs on port 3000 by default; the backend uses the configured `PORT` (4002 by default).

Before deployment, provision PostgreSQL, configure environment variables on the hosting services, and apply the database schema. Keep credentials and environment files private.

For an existing database, back it up and apply only migrations that have not already succeeded, in filename order, before deploying the updated API. The financial-integrity migration links older due-payment receipts to outstanding bills, recalculates cached bill balances from the payment/refund ledger, and adds database safeguards. The new `hospital-billing-backend/src/database/migrations/20261119_patient_age_text.sql` migration converts existing numeric ages to text so entries such as `6 month` can be stored; existing ages are preserved. Resolve duplicate open shifts or active admissions before running the financial-integrity migration.
