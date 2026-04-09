## About
An Employee Management System built with Next.js, MongoDB, and JWT-based authentication. Features role-based access control (user / admin / owner) and approval-based onboarding. Developed as part of 05506260 Full Stack Web Development, Department of Computer Science, KMITL.

## Website
https://kittamets.site/ 

# Employee Management System

Employee Management System is a full-stack employee management platform with JWT-based authentication, role-based authorization, and approval-based user onboarding. The system implements custom login, Argon2 password hashing, JWT verification with access/refresh tokens, and backend-enforced permission checks.

## Tech Stack

### Frontend
- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Leaflet (Map integration)
- Zustand (State management)

### Backend
- Next.js API Routes
- MongoDB (Mongoose ODM) - Primary database
- MongoDB GridFS - File/photo storage
- JWT (jose library)
- Argon2
- Zod (Validation)
- Arctic (OAuth)

## System Architecture

The system uses a layered architecture:

- **frontend** (`src/app/`) - Handles UI, role-based navigation, and API requests
- **backend API** (`src/app/api/`) - Receives HTTP requests and returns JSON responses
- **services** (`src/server/services/`) - Contains business rules: login, employee management, approval workflows
- **models** (`src/server/models/`) - MongoDB schemas and data access
- **middleware** (`src/middleware.ts`) - JWT verification and role-based route protection
- **MongoDB** - Stores users, employees, departments, work schedules, products, and login attempts

## Authentication Flow

This project uses a custom JWT authentication flow.

1. A user registers with email, fullName, and password.
2. The backend validates the password policy (15+ chars), checks breach status via Have I Been Pwned, and hashes the password with Argon2id.
3. A user logs in with email and password.
4. The backend verifies the password hash, checks rate limiting, and issues:
   - `accessToken` + `refreshToken` stored in HttpOnly cookies
5. The middleware validates the access token on every protected route.
6. If access token invalid/expired → middleware redirects to /api/auth/refresh.
7. /api/auth/refresh validates refresh token hash in DB → issues new access tokens.
8. If refresh token also invalid → redirect to /auth/login
  - 429 is returned only on login endpoint after 5 failed password attempts
  - 401 is returned only on API routes when called without a valid token

## Authorization Design

The system uses JWT claims plus backend permission checks. Role checks are not trusted from the frontend alone.

### Roles
- `user` - Standard employee, requires approval from admin first
- `admin` - Manager with employee/department access
- `owner` - Price&Category Manage and Admin Management

### Role Journey
- **user** - Lands on personal pages: home, calendar, map, settings (requires approval first)
- **admin** - Lands on workspace pages: employees, departments management, calendar, map, settings
- **owner** - Full system access: manages work schedules, products, pricing, and admin users. Cannot manage employees or departments directly (admin responsibility).

### Backend Authorization
- All protected routes pass through `middleware.ts`
- JWT signature and role claims are verified on every request
- Token refresh is handled automatically via redirect to `/api/auth/refresh`
- Database access is restricted by role-specific queries in services

### Permission Matrix

| Feature | User | Admin | Owner |
|---------|------|-------|-------|
| Access basic pages (home, calendar, map, settings) | Yes | Yes | Yes |
| View work schedule calendar | Yes | Yes | Yes |
| Update job status (start/complete) | Yes | Yes | Yes |
| View job history | Own only | All | All |
| Manage employees (CRUD) | No | Yes | No |
| Manage departments | No | Yes | No |
| Manage products/prices | No | View only | Yes |
| View work schedules | Own only | All | All |
| Manage work schedule assignments | No | Yes | Yes |
| View admin-management page | No | No | Yes |
| Create admin users | No | No | Yes |
| Remove admin users | No | No | Yes |
| Manage category priority (drag & drop) | No | No | Yes |
| Toggle product visibility | No | No | Yes |
| Approve new users | No | Yes | No |
| Reject/delete pending users | No | Yes | No |
| Reset employee passwords | No | Yes | No |
| View disabled employees | No | Yes | No |

### Database Access Control
- **Approval workflow**: New users default to `isApproved: false`; only owners/admins auto-approved
- **Role-based queries**: Services filter data based on user role and approval status
- **Rate limiting**: Login attempts tracked per IP + email to prevent brute force
- **User ownership**: Users can only see their own work schedules; admins/owners see all

## Security Measures (OWASP Mapping)

| Area | Implementation | OWASP Mapping |
|------|----------------|---------------|
| Password hashing | Argon2id with 19 MiB memory, 2 iterations, parallelism 1 | OWASP Password Storage Cheat Sheet |
| Password policy | Minimum 15 characters, breach check via Have I Been Pwned API | OWASP Authentication Cheat Sheet |
| No plaintext password | Passwords never stored or returned in plaintext | OWASP Password Storage Cheat Sheet |
| JWT verification | Backend verifies JWT signature, token type, and expiration | OWASP Authentication Cheat Sheet |
| Token storage | HttpOnly, Secure, SameSite=Lax cookies | OWASP Session Management Cheat Sheet |
| Rate limiting | Account lockout after failed attempts (per IP + email) | OWASP Authentication Cheat Sheet |
| Backend role enforcement | Role checks enforced in middleware and services | OWASP Authorization guidance |
| Secret management | JWT secrets and OAuth credentials from environment variables | OWASP Secrets Management |
| NoSQL Injection | Mongoose parameterized queries, Zod input validation | OWASP Injection Prevention |
| XSS prevention | React escapes rendered values; no user-provided HTML rendering | OWASP XSS Prevention Cheat Sheet |
| File upload | Image upload to MongoDB GridFS with validation | OWASP File Upload Security |

### Important Security Notes
- The system does not use end-to-end authentication services like Firebase Auth
- Passwords are hashed with Argon2id, never stored in plaintext
- JWTs are verified by the backend on every protected request
- Refresh tokens are hashed (SHA-256) and stored in the database with expiration
- Rate limiting prevents brute-force attacks on login endpoints
- Secrets are read from environment variables only
- Frontend role checks are for UX only; actual authorization is enforced by backend

## Project Structure

```
.
  src/
    app/
      (app)/                   # Protected application routes
        admin-management/      # Owner-only: admin user management (add/remove admins)
        calendar/              # Work schedule calendar with timeline view
        departments/           # Admin+: department management with color coding
        employees/             # Admin+: employee CRUD + pending approval
        home/                  # Dashboard home
        map/                   # Location map (Leaflet) + route optimization
        price/                 # Admin+: product pricing management
        settings/              # User settings
        layout.tsx             # Protected layout with auth check
      api/                     # Backend API routes
        admin/users/           # Admin management endpoints (owner only)
        auth/
          google/              # Google OAuth login
          login/               # Email/password login
          logout/              # Token revocation
          refresh/             # Token refresh
          register/            # User registration
        departments/           # Department CRUD
        employees/             # Employee CRUD + approval
        products/              # Product/price management
        profiles/me/           # Current user profile
        work-schedule/         # Schedule management
      auth/                    # Public auth pages
        login/                 # Login page
        pending/               # Approval pending page
        register/              # Registration page
        callback/              # OAuth callback
    server/
      auth/                    # Authentication utilities
        jwt.ts                 # JWT sign/verify
        password.ts            # Argon2 hashing
        rateLimit.ts           # Rate limiting logic
        session.ts             # Cookie management
        requireAuth.ts         # API route auth guard
      models/                  # Mongoose schemas
        User.ts                # User model with roles
        Employee.ts            # Employee records
        Department.ts          # Departments
        WorkSchedule.ts        # Schedule entries
        Product.ts             # Products/pricing
        LoginAttempt.ts        # Rate limit tracking
      services/                # Business logic
        auth.service.ts        # Login, register, OAuth
        employee.service.ts    # Employee management
        admin.service.ts       # Admin/owner operations
    frontend/
      components/              # React components
        ui/                    # shadcn/ui components
        Sidebar.tsx            # Navigation sidebar
        MapComponent.tsx       # Leaflet map with route optimization
        PasswordStrengthMeter.tsx
        PhotoUploadModal.tsx   # Photo upload for job verification
      lib/                     # Frontend utilities
        pwnedPassword.ts       # Breach check
        routeUtils.ts          # Navigation helpers
        uploadWorkPhoto.ts     # GridFS photo upload helper
  middleware.ts              # Next.js middleware (JWT + RBAC)
  docker-compose.yml         # Docker setup configuration
```

## Run Locally

### Prerequisites
- Node.js 20+
- MongoDB (local or MongoDB Atlas)
- npm / yarn / pnpm

### 1. Clone & Install

```bash
git clone <repo-url>
cd realfullstackproject
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file at the project root:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/your-db-name

# JWT Secrets (use a long random string, at least 32 characters)
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Google OAuth (optional — only required for Google login)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# App URL (required for OAuth redirect)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** Google OAuth is optional. The system works with email/password login without it.

### 3. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Create the First Owner Account

Register at `/auth/register`, then manually set the role in MongoDB:

```js
db.users.updateOne(
  { email: "your@email.com" },
  { $set: { role: "owner", isApproved: true } }
)
```

