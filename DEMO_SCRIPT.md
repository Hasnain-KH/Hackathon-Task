# HCM Lite — 5-minute demo

## 0:00–0:30 — Fresh first run

- Open the deployed app on a clean database and visit `/setup`.
- Create the company and first Admin; sign in and point out that there are no seeded users or business records.

## 0:30–1:30 — Organization setup

- Create a department and designation.
- Add annual, sick, casual, and unlimited unpaid leave types.
- Set office hours and (for the bonus) office coordinates and geofence radius.
- Create an HR user and note the temporary-password/change-password flow.

## 1:30–2:30 — Employee onboarding

- Sign in as HR and register three employees: a mid-month joiner, an employee who leaves mid-month, and a regular employee.
- Open an employee profile to show contact, department, designation, and salary details.
- Sign in as the first employee, change the temporary password, and check in using the normal web check-in.

## 2:30–3:15 — Smart leave

- Ask the employee assistant to prepare leave from a natural-language request.
- Show the pre-filled form and explicitly point out that AI did not submit it.
- Submit the request and approve it as HR; verify the employee's leave balance and notification update.

## 3:15–3:45 — AI and payroll

- Use the HR dashboard **Summarize** action, then ask AI “Who is on leave?”
- Generate the current-month payroll draft and review its attendance/leave calculations.
- Switch to Admin and finalize payroll.

## 3:45–4:30 — Self-service, privacy, and audit

- As the employee, open the finalized payslip and download the PDF.
- Ask AI for a colleague's salary and show the privacy refusal.
- As Admin, open the audit log and point out employee creation, leave approval, payroll finalization, and announcement events.

## 4:30–5:00 — Camera bonus

- On HTTPS (or localhost), open employee check-in with office coordinates configured.
- Show face count, GPS accuracy, distance, and the enabled check-in button. Explain that the server rechecks geofence rules and no photo is stored.
- Close with the HTTPS requirement and the fact that regular web check-in remains available.
