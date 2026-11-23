# Health Consultation Backend

## Environment
Set `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL` in the backend environment. Never commit real secrets.

## Administrator setup
Public registration cannot create administrator accounts. To provision the first administrator, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and optionally `ADMIN_NAME` in the backend environment, then run:

```bash
npm run create-admin
```

The script creates or updates the administrator account in MongoDB. Remove the temporary admin password from the environment after provisioning and use the normal login page. Administrators can access the frontend at `/admin`.

## Doctor approval workflow
Doctor registrations are stored with status `pending`. Pending doctors cannot sign in and are not listed in the patient-facing doctor directory. An authenticated administrator can approve or reject applications. Approved doctors become available to patients.

## Private messaging
All chat routes require authentication. A user can retrieve only conversations in which they are a participant. The conversation inbox endpoint returns each approved participant and their latest message:
- `GET /api/chat/conversations`
- `GET /api/chat/private/:sender/:receiver`
- `POST /api/chat/send`

Socket.IO connections require a valid JWT, and users can join only a room for an approved user of the opposite role.

## Administrator API
All endpoints below require a valid administrator JWT:
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/doctors/:id/status` with `approved`, `rejected`, or `suspended`
- `PATCH /api/admin/users/:id/status` with `approved` or `suspended`

The server checks the authenticated role on every administrator route. Hiding the admin link in the frontend is only a usability measure; API authorization is enforced on the backend.
