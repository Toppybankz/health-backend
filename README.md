# Health Consultation Platform — Backend

Express and MongoDB API for user registration, login and doctor/patient private messaging, with Socket.IO for real-time delivery.

## Technology
- Node.js and Express
- MongoDB with Mongoose
- bcryptjs for password hashing
- JSON Web Tokens for API and Socket.IO authentication
- Socket.IO for real-time chat

## Required environment variables
Create a local `.env` file (do not commit it) with:
- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — long, random signing secret
- `PORT` — optional; defaults to 5001
- `FRONTEND_URL` — optional additional allowed frontend origin

## Run locally
1. Install Node.js (version 16 or later) and npm.
2. Run `npm install`.
3. Create and populate the local `.env` file.
4. Run `npm run dev` for development or `npm start` to start the server.
5. The API is available under `/api`; the default local origin is http://localhost:5001.

## API overview
- `POST /api/auth/register` — create a patient or doctor account
- `POST /api/auth/login` — authenticate and receive a one-day JWT
- `GET /api/auth/me` — current authenticated account
- `GET /api/auth/doctors` and `GET /api/auth/patients` — authenticated user directory
- `POST /api/chat/send` — send a private message
- `GET /api/chat/private/:sender/:receiver` — read a conversation as one of its participants
- `GET /api/chat/conversations/:userId` — list the authenticated user's conversations
- `GET /api/chat/messages` — list messages involving the authenticated user

Socket.IO connections authenticate with the JWT in the handshake auth payload. Clients request a room by supplying the other participant's user ID; the server derives the room name.

## Security notes
- Keep `.env` out of Git and never expose `MONGO_URI` or `JWT_SECRET`.
- Configure `FRONTEND_URL` for the exact deployed frontend origin.
- The current registration endpoint allows the registrant to choose the doctor or patient role. A production medical service should add a trusted doctor-verification/approval workflow before treating accounts as verified clinicians.
- This repository has not yet been validated against a live database or deployed environment.
