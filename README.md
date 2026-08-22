# Car Dealership Inventory System

A full-stack dealership inventory application with a PostgreSQL-backed Express API and a responsive React marketplace interface. Northstar Auto supports authenticated browsing, inventory operations, purchasing, restocking, and role-based administration.

## Features

### Backend

- Node.js and Express REST API
- PostgreSQL persistence using repository/service/route architecture
- Registration and login with bcryptjs password hashing
- JWT token-based authentication for protected vehicle APIs
- User and admin roles
- Admin-only vehicle creation, update, deletion, and restocking
- Quantity tracking, purchase decrementing, and oversell prevention
- 25 demo vehicles seeded in PostgreSQL with realistic INR pricing

### Frontend

- React, Vite, and Tailwind CSS
- Responsive single-page application
- Registration, login, logout, and persisted JWT session state
- Vehicle dashboard with realistic vehicle imagery
- Category, minimum-price, and maximum-price filtering
- INR display with Indian number formatting
- Frontend-only wishlist stored in localStorage
- Location selector with Hyderabad as the default city
- Featured vehicles, dealership-style hero section, and Offers navigation
- Admin controls shown only to users with the `admin` role

## Tech Stack

- Backend: Node.js, Express, PostgreSQL, JWT, bcryptjs
- Frontend: React, Vite, Tailwind CSS
- Testing: Vitest and Supertest

## Project Structure

```text
backend/       Express API, PostgreSQL configuration, services, repositories, and tests
frontend/      React/Vite SPA and responsive UI
PROMPTS.md     Raw AI conversation and prompt material required by the assignment
README.md      Project documentation
```

## API

Authentication endpoints:

```text
POST /api/auth/register
POST /api/auth/login
```

Protected vehicle endpoints require `Authorization: Bearer <token>`:

```text
GET    /api/vehicles
GET    /api/vehicles/search
POST   /api/vehicles
PUT    /api/vehicles/:id
DELETE /api/vehicles/:id
POST   /api/vehicles/:id/purchase
POST   /api/vehicles/:id/restock
```

`GET /api/vehicles/search` supports these query filters:

- `make`
- `model`
- `category`
- `minPrice`
- `maxPrice`

Vehicle listing and search are backed by PostgreSQL. Purchase and restock operations update persisted inventory quantities, and purchasing cannot oversell a vehicle.

## Windows PowerShell Setup

### 1. Clone the repository

```powershell
git clone <repository-url>
cd car-dealership-kata
```

### 2. Configure PostgreSQL

Install and start PostgreSQL, then create a database named `car_dealership` using your PostgreSQL administration tool or `psql`.

### 3. Create the backend environment file

```powershell
Copy-Item backend\.env.example backend\.env
```

Edit `backend\.env` with local values:

```env
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/car_dealership
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

### 4. Install backend dependencies

```powershell
Set-Location backend
npm install
```

### 5. Run the migration

```powershell
npm run db:migrate
```

### 6. Start the backend

```powershell
npm start
```

The backend runs at `http://localhost:5000/`.

### 7. Install frontend dependencies

Open a second PowerShell terminal from the repository root:

```powershell
Set-Location frontend
npm install
```

### 8. Start the frontend

```powershell
npm run dev
```

Open `http://localhost:5173/` in a browser.

The migration initializes the database schema. The 25 demo vehicles must be present in the configured PostgreSQL database for the seeded inventory view.

## Testing And Verification

Backend verification was run against a real PostgreSQL database:

```text
Test Files: 14 passed (14)
Tests: 126 passed (126)
Failures: 0
Exit code: 0
```

Run the backend tests with:

```powershell
Set-Location backend
npm test -- --run
```

Frontend verification:

- `npm run lint`: passed with two non-blocking existing React hook warnings
- `npm run build`: passed successfully
- Browser verification confirmed that authenticated `GET /api/vehicles` returns the PostgreSQL inventory when the database is seeded

## Test-Driven Development

Backend development followed a red-green-refactor workflow where appropriate. The test suite covers:

- Registration
- Login
- JWT middleware
- Admin authorization
- Vehicle creation
- Vehicle listing
- Vehicle update
- Vehicle deletion
- Vehicle search
- Vehicle purchase
- Vehicle restock
- Service-layer behavior

## My AI Usage

GitHub Copilot and ChatGPT were used during development.

AI assistance was used for:

- Brainstorming and planning implementation
- Generating and refining tests
- Debugging backend and frontend issues
- Diagnosing PostgreSQL and database behavior
- Frontend UI development and refinement
- Reviewing API integration
- README and documentation assistance

AI accelerated debugging and development, but the implementation and verification were checked manually. Particular attention was given to API behavior, PostgreSQL persistence, authentication, inventory operations, frontend flows, and test results.

`PROMPTS.md` contains the raw AI conversation and prompt material required by the assignment and is included at the repository root.

## Screenshots

The screenshot files are not currently committed in the repository. The final submission should include screenshots for:

- Login/Register
- User inventory dashboard
- Search/filter
- Wishlist
- Purchase and inventory quantity
- Admin dashboard
- Admin vehicle management
- PostgreSQL/database verification

## Security And Git Hygiene

- Secrets are stored locally in `backend/.env`.
- `backend/.env` must never be committed.
- `.env` is excluded through `.gitignore`.
- Replace the example JWT secret with a long, random local or deployment secret.
- Never include real passwords, tokens, or connection secrets in source code or documentation.
