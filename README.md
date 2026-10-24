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

## Attendance module

Attendance records use server-stamped check-in and check-out times, with local work dates based on `TZ` (defaults to `Asia/Karachi`). Employees can review their calendar and request corrections; HR/Admin can view the daily board and review requests. Camera capture and location enforcement are not included.

## Leave module

Employees can review their annual leave balances, preview working days, apply for leave, and cancel eligible requests. HR/Admin can review pending requests; approvals update eligible attendance dates to `on_leave`. Weekends and configured public holidays are excluded from working-day counts. Leave types, quotas, and holidays are configured through Organization Setup; no leave types or other sample data are seeded.

## AI assistant

Configure the AI provider only on the server in `server/.env`:

```dotenv
AI_API_KEY=your_provider_key
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

The API uses OpenAI-compatible Chat Completions and function calling. Free or trial keys may be available from [Groq](https://console.groq.com/keys), [OpenRouter](https://openrouter.ai/keys), or [Google AI Studio](https://aistudio.google.com/apikey); set the matching compatible base URL and model for your provider. If no key is configured, the app still starts and AI endpoints return a friendly 503.

The assistant can answer policy questions, summarize server-generated dashboard data, look up role-permitted information, and pre-fill (but never submit) an employee leave request. Employees cannot search other employees or receive another person's salary, attendance, leave, or personal data. It does not write business records. Chat history is kept in browser memory only and is cleared on refresh.

Requests are limited to 20 per user per hour using an in-memory server map; limits reset when the server restarts. Prompts, responses, tool-call metadata, and timings are recorded in `AiLog` for debugging. Password fields are not accepted by AI endpoints and credential-like prompt values are redacted before logging. The provider key is server-only and is never sent to the browser or stored in AI logs.

## Payroll Lite

HR can generate and refresh monthly payroll drafts from employee salary structures, attendance, approved leave, company weekends, and public holidays. Admins finalize drafts, after which they are locked; employees can only access and download their finalized payslips. Payroll PDF generation uses PDFKit. Tax slabs follow the illustrative annualized rules supplied for this step. No payroll or employee seed data is added.
