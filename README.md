# SmartDokan — Authentication Module

Scope: registration, login, JWT auth (httpOnly cookie), bcrypt password hashing,
protected routes, and role-based access control (`admin`, `manager`, `staff`).

## Backend setup

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm run dev
```

API base: `http://localhost:5000/api`

| Method | Endpoint | Access |
|---|---|---|
| POST | /auth/register | Public |
| POST | /auth/login | Public |
| POST | /auth/logout | Private |
| GET  | /auth/me | Private |

## Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Role-based access

- New users always register as `staff`. Promoting a user to `manager`/`admin`
  is an intentional, separate admin action (belongs to a future user-management
  module) — not exposed on public registration, to prevent privilege escalation.
- Backend: use `authorize('admin', 'manager')` after `protect` on any route.
- Frontend: wrap routes with `<ProtectedRoute allowedRoles={['admin']} />`.

## Security notes

- Passwords hashed with bcrypt (cost factor 10), never returned in queries (`select: false`).
- JWT delivered via httpOnly, sameSite cookie — not accessible to client-side JS.
- `Authorization: Bearer <token>` header also supported for non-browser API clients.
- Centralized error handler normalizes Mongoose/JWT errors into consistent JSON.
