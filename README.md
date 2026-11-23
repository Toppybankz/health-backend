# Health Consultation Backend

REST API and Socket.IO service for the Health Consultation application. It handles authentication, account approval, administrator operations, and authenticated private messaging.

## Technology
- Node.js and Express
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Socket.IO for real-time private messages

## Getting started

1. Install Node.js 20 or later and MongoDB.
2. Clone this repository and install dependencies:

   ```bash
   npm ci
   ```

3. Create a local `.env` file (do not commit it):

   ```env
   PORT=5001
   MONGO_URI=mongodb://127.0.0.1:27017/health-consultation
   JWT_SECRET=replace-with-a-long-random-secret
   FRONTEND_URL=http://localhost:3000
   ```

4. Start the API:

   ```bash
   npm run dev
   ```

   Or use `npm start` for a normal Node.js process.

The API listens on port 5001 by default and connects to MongoDB before accepting requests.

## Administrator provisioning

Administrator accounts cannot be created through public registration. Configure these variables in the backend environment:

```env
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=use-a-unique-password-of-at-least-12-characters
ADMIN_NAME=Platform Administrator
```

Then run:

```bash
npm run create-admin
```

The script creates or updates the administrator record. Keep the password private, do not commit it, and remove the temporary variable from the environment after provisioning. If the application uses `SECRET_ENV_PATH`, the provisioning script reads that same environment file.

## Account lifecycle and authorization

- Public registration accepts only the `doctor` and `patient` roles.
- New doctors start as `pending` and cannot sign in until approved.
- Patients are approved on registration.
- Administrator endpoints require a valid JWT and the `admin` role.
- Chat HTTP endpoints and Socket.IO connections require authenticated, approved doctor or patient accounts.
- Private conversation history is restricted to one of its two participants.

## Main API routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register a patient or doctor |
| POST | `/api/auth/login` | Sign in and receive a JWT |
| GET | `/api/auth/me` | Get the authenticated account |
| GET | `/api/auth/doctors` | List approved doctors |
| GET | `/api/auth/patients` | List approved patients for permitted roles |
| GET | `/api/chat/conversations` | Get the user's conversation inbox |
| GET | `/api/chat/private/:sender/:receiver` | Get a participant-only conversation |
| POST | `/api/chat/send` | Send a private message |
| GET | `/api/admin/overview` | Get administrator dashboard counts |
| GET | `/api/admin/users` | List patient and doctor accounts |
| PATCH | `/api/admin/doctors/:id/status` | Approve, reject, or suspend a doctor |
| PATCH | `/api/admin/users/:id/status` | Approve or suspend a patient |

Protected HTTP requests use the header `Authorization: Bearer <token>`.

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify JWTs |
| `FRONTEND_URL` | Recommended | Allowed frontend origin for CORS |
| `PORT` | No | API port; defaults to 5001 |
| `SECRET_ENV_PATH` | No | Alternate path to the environment file |
| `ADMIN_EMAIL` | Provisioning only | Administrator email |
| `ADMIN_PASSWORD` | Provisioning only | Administrator password (12+ characters) |
| `ADMIN_NAME` | No | Administrator display name |

## Quality checks

Run the built-in unit tests:

\`\`\`bash
npm test
\`\`\`

Run the tests and JavaScript syntax checks together:

\`\`\`bash
npm run check
\`\`\`

GitHub Actions runs these checks for pull requests and pushes to the main and fix branches. Unit tests cover private-chat input validation; they do not replace integration testing against a configured MongoDB instance.

## Current scope and limitations

This repository provides the backend for a portfolio project. It has not been represented as a production-certified medical system. Before handling real patient information, the application would need a formal privacy, security, operational, and regulatory review, plus comprehensive automated and integration tests.
