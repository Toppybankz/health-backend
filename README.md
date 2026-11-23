# Health Consultation Backend

REST API and Socket.IO service for the Health Consultation frontend. It provides patient and doctor authentication, administrator approval workflows, and authenticated private messaging.

## Project overview

- **Runtime:** Node.js and Express
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT and bcrypt password hashing
- **Real-time messaging:** Socket.IO
- **Related frontend:** [health-consultation-frontend](https://github.com/Toppybankz/health-consultation-frontend)

## Features

- Patient and doctor registration and login
- Pending doctor applications with administrator approval
- Administrator-only user and account-status management
- JWT-protected API routes
- Private doctor/patient conversations
- Socket.IO authentication and participant-only room access
- MongoDB connection required before the API starts
- Health endpoint for hosting-platform checks

## Local setup

1. Install Node.js 20 or later and MongoDB.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Create a local environment file from the example:

   ```bash
   cp .env.example .env
   ```

4. Set a private, long random value for `JWT_SECRET`. Keep `.env` out of Git.
5. Start the API:

   ```bash
   npm run dev
   ```

The API listens on port `5001` by default. The local MongoDB example uses `mongodb://127.0.0.1:27017/health-consultation`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Private secret used to sign and verify JWTs |
| `FRONTEND_URL` | Recommended | Comma-separated allowed frontend origins |
| `PORT` | No | Server port; defaults to 5001 |
| `SECRET_ENV_PATH` | No | Alternate path to the environment file |
| `ADMIN_EMAIL` | Provisioning only | Administrator email |
| `ADMIN_PASSWORD` | Provisioning only | Unique administrator password (12+ characters) |
| `ADMIN_NAME` | No | Administrator display name |

Never commit credentials, database connection strings, or production environment files.

## Deployment (Render)

A starter Render Blueprint is included in [render.yaml](./render.yaml).

1. Create a MongoDB Atlas database for this application and create a database user with a strong, unique password.
2. In Atlas Network Access, allow access only from the hosting service's supported outbound IP ranges where possible. A broad allow-all rule is not recommended for production.
3. In Render, create a new Blueprint deployment from this repository and review the service before creating it.
4. Set the service's `MONGO_URI` to the Atlas connection string.
5. Set `FRONTEND_URL` to the exact deployed frontend origin, for example `https://health-consultation-frontend.vercel.app`. Multiple origins can be comma-separated.
6. Render generates `JWT_SECRET` from the Blueprint. Keep all environment values private.

The Render health check uses `GET /health`. It returns HTTP 200 only when MongoDB is connected. `GET /` returns basic service information.

## Administrator provisioning

Public registration cannot create administrator accounts. To provision an administrator, set `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), and optionally `ADMIN_NAME` in the backend environment, then run:

```bash
npm run create-admin
```

For a hosted deployment, run the script in the hosting provider's protected shell or one-off command environment. Do not put credentials in source control, issue comments, screenshots, or chat messages. Remove temporary provisioning values when finished.

## API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/` | Service information |
| GET | `/health` | Service and database health |
| POST | `/api/auth/register` | Register a patient or doctor |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/auth/me` | Get the authenticated account |
| GET | `/api/auth/doctors` | List approved doctors |
| GET | `/api/auth/patients` | List permitted approved patients |
| GET | `/api/chat/conversations` | Get the user's conversation inbox |
| GET | `/api/chat/private/:sender/:receiver` | Get a participant-only conversation |
| POST | `/api/chat/send` | Send a private message |
| GET | `/api/admin/overview` | Get administrator dashboard counts |
| GET | `/api/admin/users` | List patient and doctor accounts |
| PATCH | `/api/admin/doctors/:id/status` | Approve, reject, or suspend a doctor |
| PATCH | `/api/admin/users/:id/status` | Approve or suspend a patient |

Protected HTTP requests use `Authorization: Bearer <token>`. Socket.IO clients authenticate with the JWT in the handshake auth payload.

## Quality checks

```bash
npm test
npm run check
```

GitHub Actions runs the unit tests and JavaScript syntax checks. Current automated tests cover private-chat input validation; live MongoDB/API/Socket.IO integration testing is still required before production use.

## Security, privacy and limitations

- Doctor accounts remain pending until an administrator approves them.
- Public registration accepts only patient and doctor roles.
- Admin routes enforce authorization on the server.
- Chat history and Socket.IO rooms are restricted to approved participants.
- Use synthetic test data only in this portfolio environment.

This is a demonstration/portfolio project, not a certified clinical system. Do not use it for real patient data or clinical decisions. Before any real-world healthcare use, it needs independent security testing, privacy and data-protection assessment, clinical safety review, operational monitoring, backup/recovery planning, and applicable regulatory review.
