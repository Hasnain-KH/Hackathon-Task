# HCM Lite submission

## Links

- Git repository: `<repository-url>`
- Hosted app: `<frontend-url>`

## Status

Implemented: first-run setup and role-based authentication; organization setup; employee directory and self-service; attendance and corrections; leave; payroll; dashboards; AI assistance; announcements, notifications, and audit history; optional camera face-count/geofence check-in; and pure-logic server tests.

Not included: seeded/demo data, server-side biometric identity verification, image capture/storage, and automated AI business actions. Camera face detection is browser-based and is not proof of identity. AI availability depends on an operator-configured provider key; without it, AI APIs report that they are unavailable.

HCM Lite starts with an empty database and lets an Admin create the company and initial account through setup. HR can configure employees and run day-to-day people operations, while employees use scoped self-service for attendance, leave, and finalized payslips. Role checks, audit history, notifications, and optional server-validated camera geofencing support the workflow; the optional camera path stores no photographs.
