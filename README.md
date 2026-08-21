# Car Dealership Inventory System

A full-stack car dealership inventory project built with a Node.js/Express backend and a React/Vite frontend. The project follows a test-first workflow and includes JWT-based auth, inventory management, and a showroom dashboard UI.

## Overview

This kata simulates a modern dealership workflow:

- User registration and login with password hashing and JWT tokens
- Vehicle listing with search and category filtering
- Inventory purchase and restock flows
- Admin-only vehicle management actions
- REST API built for a PostgreSQL-backed persistence layer
- React SPA for the customer and admin dashboard

## Tech Stack

- Backend: Node.js, Express, PostgreSQL, JWT, bcryptjs, Vitest, Supertest
- Frontend: React, Vite, Tailwind CSS
- Testing: backend suite is written first and validated with Vitest

## Project Structure

- backend/: Express API, repository/service layers, tests, SQL-ready configuration
- frontend/: React SPA dashboard and styling
- README.md: project summary and setup guidance
- PROMPTS.md: prompt log and AI usage notes

## Local Setup

1. Install frontend dependencies:
   cd frontend
   npm install

2. Install backend dependencies:
   cd backend
   npm install

3. Configure PostgreSQL:
   Create a backend/.env file or copy backend/.env.example if present.
   Set DATABASE_URL to your PostgreSQL connection string, for example:
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/car_dealership
   JWT_SECRET=replace-with-a-long-random-secret

4. Run the database migration:
   cd backend
   npm run db:migrate

5. Verify the database connection:
   - Confirm the PostgreSQL server is running
   - Confirm the database exists
   - Confirm the `users` and `vehicles` tables were created

6. Start the backend:
   cd backend
   npm run dev

7. Start the frontend:
   cd frontend
   npm run dev

8. Open the frontend app at:
   http://localhost:5173/

## API Highlights

- POST /api/auth/register
- POST /api/auth/login
- GET /api/vehicles
- POST /api/vehicles
- PUT /api/vehicles/:id
- DELETE /api/vehicles/:id
- POST /api/vehicles/:id/purchase
- POST /api/vehicles/:id/restock

## Verification

The project was validated with fresh commands:

- Backend tests: `cd backend && npm test -- --run`
  Result: 2 test files passed, 10 tests passed

- Frontend build: `cd frontend && npm run build`
  Result: Vite production build succeeded

## My AI Usage

This project was developed with GitHub Copilot support for:

- scaffolding the backend and frontend structure
- creating a TDD-first test suite for auth and inventory logic
- resolving ESM and Vitest configuration issues
- generating the dashboard layout and dealership-themed UI
- documenting the final project setup and implementation notes

## Notes

The API is configured to connect to PostgreSQL through DATABASE_URL and is ready for a real database-backed deployment. In this local environment, Docker and a live PostgreSQL instance were not available, so the backend was verified via the service-layer test suite and the frontend build rather than a full live DB integration run.
