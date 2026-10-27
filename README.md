# HCM Lite
Human Capital Management for small teams, built as a role-based full-stack application.

## Live links
- Frontend: `<url>`
- Backend: `<url>`

## Tech stack
- **Backend:** Node.js 18+, Express, MongoDB/Mongoose, JWT, bcryptjs
- **Frontend:** React, Vite, React Router, Tailwind CSS, Axios
- **AI provider:** OpenAI-compatible Chat Completions API (configure a provider and model on the server)

## Features by role

### Admin
- [x] Create the company and first Admin on first run; configure company settings.
- [x] Manage departments, designations, leave types, yearly quotas, and public holidays.
- [x] Create HR accounts, activate/deactivate accounts, and reset temporary passwords.
- [x] Register, search, filter, edit, terminate, import, and export employee records.
- [x] Review attendance boards and employee attendance corrections.
- [x] Review leave requests and leave balances.
- [x] Generate, review, and finalize monthly payroll runs.
- [x] View role-scoped dashboard summaries and AI-generated insights.
- [x] Post role-targeted announcements, receive notifications, and inspect the audit log.

### HR
- [x] Read company organization settings and lists; manage employee records.
- [x] Search, filter, paginate, and view employee 360 profiles.
- [x] Import employees from CSV with validation preview and export the directory.
- [x] Review attendance boards and attendance correction requests.
- [x] Review employee leave requests and balances.
- [x] Generate and review monthly payroll drafts.
- [x] View HR dashboard summaries and role-scoped AI insights.
- [x] Read role-targeted announcements; announcement publishing is Admin-only.
- [x] Receive and manage personal notifications.

### Employee
- [x] View and edit their own profile phone number and address.
- [x] Check in/out and review personal attendance history.
- [x] Request attendance corrections and review their status.
- [x] View leave balances, request leave, and cancel eligible requests.
- [x] View finalized payslips and download PDF copies.
- [x] Read announcements and receive leave, attendance, and payslip notifications.
- [x] Use AI assistance for personal leave balance and leave-form prefill only.

## Business rules summary
- The app starts with no demo accounts or business records; setup creates the first Admin.
- Employees can access only their own employee profile, attendance, leave, and finalized payslips.
- Department, designation, leave-type, and company changes require Admin access; HR organization reads are read-only.
- Leave working days exclude configured weekends and public holidays. Pending and approved requests count against availability.
- Salary gross uses 1.5 × basic when allowance components are all zero; otherwise it is basic plus stored allowances. Payroll prorates for active working days and applies annualized progressive tax slabs: 0% through PKR 600,000; 5% above PKR 600,000; 15% above PKR 1,200,000; 25% above PKR 2,400,000; and 35% above PKR 3,600,000, with the preceding slab tax carried forward.
- Attendance and date operations use the configured timezone (default `Asia/Karachi`).

### AI assistant (Google Gemini)

Provider: Google Gemini via OpenAI-compatible endpoint.

Required environment variables (server side only — never expose to the
browser, never commit real values):

AI_API_KEY=<your-gemini-api-key>
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
AI_MODEL=gemini-2.0-flash

Get a free key at: https://aistudio.google.com/app/apikey

Free tier (gemini-2.0-flash) is ~15 requests/min and ~1500 requests/day —
enough for the hackathon demo.

## First-run setup

1. **UI:** start the app, open `/setup`, and create the company and first Admin.
2. **Environment bootstrap:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`. If the database is uninitialized, the server creates the first Admin and a default `My Company` record.

There is no seeded data. The first-run process creates your Admin; all other business data is added by users through the app.

## Local development

Prerequisites: Node.js 18+, npm, and MongoDB running locally or an Atlas connection string.

Server terminal:

```powershell
cd server
Copy-Item .env.example .env
npm i
npm run dev
```

Set `MONGO_URI` and a strong `JWT_SECRET` in `server/.env`. The API listens on port 5000. If MongoDB is unavailable, the server may start with a warning, but database-backed flows will not work.

Client terminal:

```powershell
cd client
npm i
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the server.

The root `npm run dev` command starts both the API and frontend. MongoDB must be
running at `mongodb://127.0.0.1:27017/hcm_lite` (the default), or `MONGO_URI`
must point to a reachable MongoDB instance in `server/.env`. Without a database,
the API can start but the app cannot complete setup or sign in.

## Completed and not included

Authentication, organization setup, employees, attendance, leave, payroll, dashboards, AI assistance, announcements, personal notifications, and administrative audit history are implemented. The application does not include sample data. Camera attendance is an optional browser-only face-count plus server geofence check; it is not biometric identity verification. Advanced analytics and automated AI actions are not included.

## Operational notes

- AI rate limits are stored in memory and reset on server restart; use a shared store before multi-instance deployment.
- The notification bell checks unread counts every 30 seconds.
- Notifications are best-effort: a failed notification must not undo the business action that triggered it.
- Audit before/after values omit password hashes, temporary passwords, tokens, and API keys.
- Camera attendance stores no images or video. Browser face detection only verifies a face count; production identity verification requires a server-side face verification system.

## Bonus: Camera attendance

When an Admin configures office latitude, longitude, and radius, an employee with no attendance record for today can choose **Check in with camera**. Face detection runs in the browser using a model loaded from the face-api CDN; the server independently checks that exactly one face was reported, GPS accuracy is at most `CAMERA_MAX_ACCURACY` (capped at 100 meters), and the coordinates fall within the configured office radius. The check-in timestamp is still stamped by the server. The normal web check-in remains available if camera, model download, or location access is unavailable.

No photos or video are captured, uploaded, or stored. Only the detected face flag, attendance source, and location are stored with the attendance record. Audit location values are rounded to four decimal places. Browser face detection is not identity verification and can be spoofed; a production deployment requiring identity assurance must add server-side face verification.

`getUserMedia` and geolocation require a secure browser context: localhost is allowed for local development, while hosted sites must use HTTPS. Admins can disable the option by leaving office latitude and longitude blank. Set `CAMERA_MAX_ACCURACY=100` in the server environment to enforce the 100-meter GPS accuracy ceiling.

## Deployment preparation

### Backend (Render, Railway, or Fly.io)

Deploy the `server` workspace and set these environment variables:

```dotenv
PORT=<platform-provided>
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
JWT_EXPIRES_IN=1d
ADMIN_EMAIL=<first admin email, optional if setup is completed in the UI>
ADMIN_PASSWORD=<first admin password, optional if setup is completed in the UI>
AI_API_KEY=<provider key, optional>
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
TZ=Asia/Karachi
CLIENT_ORIGIN=https://<frontend-domain>
CAMERA_MAX_ACCURACY=100
CAMERA_FACE_DESCRIPTOR_MATCHING=false
```

`CAMERA_FACE_DESCRIPTOR_MATCHING` is reserved and unused in this step.

The `CLIENT_ORIGIN` variable accepts a comma-separated list of allowed browser origins. The server trusts one reverse-proxy hop for request IP reporting.

### Frontend (Vercel or Netlify)

Deploy the `client` workspace. Set `VITE_API_BASE_URL=https://<backend-url>/api`; keep it empty for the local Vite proxy. The local `/api` proxy remains configured in `client/vite.config.js`. `client/.env.example` contains the variable name.

### MongoDB and post-deploy smoke test

Create a MongoDB Atlas free cluster and set its connection string as `MONGO_URI`. For a temporary hackathon deployment, Atlas network access may allow `0.0.0.0/0`; restrict this to trusted addresses for production. Use HTTPS for the hosted frontend when camera attendance is enabled. After deployment, request `https://<backend-url>/api/health` and confirm the response reports `ok: true` and `database: "connected"`, then open the frontend and complete first-run setup.

## Judge walkthrough

1. Use a fresh database name (or drop the existing demo database) so no prior data is present.
2. Start server and client, visit `/setup`, create the company and Admin, sign in, and verify dashboard/list empty states. Take a screenshot of setup and the empty dashboard.
3. As Admin, create a department and designation; configure annual (14 days), sick (8), casual (10), and unpaid (unlimited) leave types; set office hours and, if demonstrating camera, office coordinates/radius; create an HR login. Screenshot organization settings and leave types.
4. As HR, register three employees: one mid-month joiner, one with a leaving date/status set for the demo, and one regular employee. Screenshot the directory and one 360 profile.
5. As Employee 1, change the temporary password, check in using the web button, and submit a natural-language smart-leave request. As HR, approve it and verify the employee balance. Capture the leave form and approval.
6. As HR, generate payroll for the current month and check calculations against the stored salary, active working days, leave/attendance, and tax rules. As Admin, finalize the run.
7. As Employee 1, open the finalized payslip and download its PDF. Ask AI for another employee's salary and confirm the privacy refusal. As Admin, review audit events for employee creation, leave approval, payroll finalization, and announcement.
8. Post an announcement as Admin and verify it appears for employees. Confirm an employee calling `/api/audit` receives 403 and trying a colleague's payslip is denied. Capture screenshots of the announcement, notification, audit log, and access-denied checks.
9. Run the six AI questions in [JUDGE_QA.md](./JUDGE_QA.md). If demonstrating the optional camera flow, configure coordinates, use HTTPS (localhost is allowed), confirm the browser face-count and geofence checks, and verify that no photo is stored.

## Hosting walkthrough

1. Create an Atlas cluster, database user, and connection URI; set `MONGO_URI` on the backend.
2. Deploy `server` to Render, Railway, or Fly.io and configure the backend variables above. Complete `/setup` on a fresh database or set the optional first-admin environment credentials.
3. Deploy `client` to Vercel or Netlify with `VITE_API_BASE_URL=https://<backend-url>/api`.
4. Set `CLIENT_ORIGIN` to the exact frontend origin(s), including scheme; set the provider key and provider URL/model only if enabling AI.
5. Enable HTTPS, configure office coordinates if using camera check-in, verify `/api/health`, then complete the judge walkthrough without seeded data.

## License and credits

Hackathon project. Add the repository's chosen license and contributor credits before distribution.
