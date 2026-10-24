# HCM Lite — Step 1

HCM Lite is a small human capital management app scaffold. This step delivers company first-run setup, administrator creation, authentication, protected role-based routes, and placeholder dashboards. It intentionally starts with no sample users, employees, or other dummy data.

## Stack

- Server: Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, dotenv, cors, helmet, morgan, express-validator
- Client: React, Vite, React Router v6, Tailwind CSS, axios
- API port: `5000`; client port: `5173`

## Requirements

- Node.js and npm
- MongoDB running locally or an accessible MongoDB connection string

## Run locally

1. Copy `server/.env.example` to `server/.env`. Set a strong `JWT_SECRET` and, if needed, update `MONGO_URI`.
2. In one terminal, install and start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

3. In another terminal, install and start the client:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173). The API health check is [http://localhost:5000/api/health](http://localhost:5000/api/health).

The Vite development server proxies `/api` requests to `http://localhost:5000`. If MongoDB is unavailable, the API still starts so its health endpoint remains available; setup and authentication require a working database.

## Creating the first Admin

On a new database, visit the client and complete the `/setup` form with a company name, admin name, email, and password (at least 8 characters). Setup creates the company settings and first Admin account; subsequent setup attempts are rejected.

For non-interactive first run, fill in `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`. When the database has not yet been initialized, the server creates the Admin and company settings with company name `My Company`. Do not commit `.env` or expose credentials.

## Step 1 scope

Implemented: server/client scaffold, database connection handling, first-run company setup, optional environment-based Admin bootstrap, login, current-user lookup, password change, logout endpoint, JWT authentication, role-based protected routes, and Admin/HR/Employee placeholder dashboards.

Later steps may add employee management, attendance, leave, payroll, and real dashboard functionality. No employee workflows, operational dashboards, AI, camera, CSV, or seed data are included in Step 1.

## Organization setup module

The organization setup module adds Admin-managed company settings, departments, designations, leave types, public holidays, and HR login creation. HR users have read-only access to organization lists; employee and payroll workflows remain placeholders.

## Employee module

HR can register employee records and initial logins, search and filter the directory, edit employee profiles, terminate an employee login, and import/export CSV. Employees can view their own profile and change only their phone and address. Salary components are stored on the employee record; gross is displayed as 1.5 times basic salary. No attendance, leave, or payroll processing is included here.
