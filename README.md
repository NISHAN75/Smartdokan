# SmartDokan

A full-stack inventory, sales, and business-management system for a single retail shop — built with the MERN stack (MongoDB, Express, React, Node.js).

**Live app:** [smartdokan-mu.vercel.app](https://smartdokan-mu.vercel.app/)
**Frontend source:** [github.com/NISHAN75/Smartdokan/tree/main/frontend](https://github.com/NISHAN75/Smartdokan/tree/main/frontend)
**Backend source:** [github.com/NISHAN75/Smartdokan/tree/main/backend](https://github.com/NISHAN75/Smartdokan/tree/main/backend)

---

## Overview

SmartDokan helps a shop owner manage their entire retail operation from one dashboard: products and categories, live stock levels backed by a full movement ledger, a point-of-sale screen for checkout, purchases from suppliers, customer and supplier records with running balances, expenses, and reports — with role-based access for admin, manager, and staff accounts.

## Features

- **Authentication** — JWT-based sessions delivered via an httpOnly cookie; register/login/logout; forgot/reset password via email (Resend)
- **Role-based access control** — `admin` / `manager` / `staff` roles, enforced on both the API and the frontend routes/navigation
- **User management** (admin-only) — create staff accounts, change roles, activate/deactivate users, with safeguards against removing the last active admin
- **Categories & Products** — full CRUD, search, filters, pagination
- **Inventory & Stock Movements** — live stock overview (in-stock / low-stock / out-of-stock), plus a full Stock In / Stock Out / Adjustment ledger so every stock change is auditable
- **Sales / POS** — a checkout screen with product search, cart, discounts, multiple payment methods, and printable invoices; stock is deducted through the movement ledger, never by editing products directly
- **Purchases** — record stock coming in from suppliers, with purchase-level payment tracking
- **Customers & Suppliers** — contact records, purchase/sale history, and running due/balance tracking (including supplier payments)
- **Expenses** — categorized business expense tracking
- **Dashboard & Reports** — sales, stock, and financial summaries
- **Notifications** — in-app alerts (e.g. low stock)
- **Settings** — per-user profile, password, and business preferences

## Tech stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Resend (transactional email)
**Frontend:** React 18, Vite, React Router, TanStack Query, Axios, Tailwind CSS, Lucide icons

**Deployment:** Frontend on [Vercel](https://vercel.com), backend on [Render](https://render.com), database on [MongoDB Atlas](https://www.mongodb.com/atlas)

## Project structure

```
Smartdokan/
├── backend/            # Express API
│   ├── controllers/    # Route handlers / business logic
│   ├── models/         # Mongoose schemas
│   ├── routes/         # Express routers
│   ├── middleware/     # Auth, error handling
│   ├── utils/          # Shared helpers (tokens, email, API features)
│   └── server.js
└── frontend/           # React app
    ├── src/
    │   ├── api/         # Axios request functions per module
    │   ├── hooks/       # React Query hooks per module
    │   ├── pages/        # Route-level pages
    │   ├── components/   # Reusable UI + module-specific components
    │   ├── context/       # Auth context
    │   └── layouts/       # Shared dashboard shell (sidebar/navbar)
    └── vite.config.js
```

## Getting started locally

### Prerequisites

- Node.js ≥ 18
- A MongoDB connection string (local or [Atlas](https://www.mongodb.com/atlas))
- A [Resend](https://resend.com) API key (only required for the forgot/reset-password email; the app runs fine without it otherwise)

### Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=<your MongoDB connection string>
JWT_SECRET=<a long random string>
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

# Email (Resend) — used for password-reset emails
RESEND_API_KEY=<your Resend API key>
RESEND_FROM=SmartDokan <onboarding@resend.dev>
```

```bash
npm run dev
```

API runs at `http://localhost:5000/api`.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

App runs at `http://localhost:5173`.

### First login

Register a new account from the app's Register page — the first account you create can be promoted to `admin` directly in MongoDB (`role: "admin"`) so you can access User Management and create further staff accounts from within the app afterward.

## API overview

All endpoints are mounted under `/api`. Every route except `/auth/register`, `/auth/login`, `/auth/forgot-password`, and `/auth/reset-password` requires an authenticated session (httpOnly cookie).

| Base path | Covers |
|---|---|
| `/auth` | Register, login, logout, current session, password reset |
| `/users` | User management *(admin only)* |
| `/categories` | Product categories |
| `/products` | Product catalog |
| `/inventory` | Live stock overview |
| `/stock-movements` | Stock In / Out / Adjustment ledger |
| `/sales` | POS checkout & sales history |
| `/purchases` | Supplier purchases |
| `/customers` | Customer records |
| `/suppliers` | Supplier records & payments |
| `/expenses`, `/expense-categories` | Business expenses |
| `/reports` | Reporting endpoints |
| `/dashboard` | Dashboard summary data |
| `/notifications` | In-app notifications |
| `/settings` | Per-user profile & business settings |

## Deployment notes

- The frontend and backend are on different domains (Vercel and Render), so the auth cookie is issued with `Secure; SameSite=None` whenever `CLIENT_URL` is an `https://` origin — this is derived automatically rather than depending solely on `NODE_ENV`, so it stays correct even if that variable is left unset on the host.
- Required environment variables on Render: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `CLIENT_URL` (your deployed frontend URL, no trailing slash), `RESEND_API_KEY`, `RESEND_FROM`. Setting `NODE_ENV=production` is recommended (it also disables verbose error stacks in API responses).
- Required environment variable on Vercel: `VITE_API_URL` (your deployed backend's `/api` base URL).
- Resend's shared `onboarding@resend.dev` sender can only deliver to the email address on your own Resend account until a custom domain is verified at [resend.com/domains](https://resend.com/domains). Verify a domain there before relying on password-reset emails reaching arbitrary users in production.

## License

Private project — all rights reserved.
