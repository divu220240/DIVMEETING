# DivMeeting

A production-ready screen sharing and webinar web application built with React, Tailwind CSS, Node.js, Express, Socket.IO, WebRTC, MongoDB, and JWT authentication.

## Folder Structure

```
root/
├── client/ (React app)
 │   ├── src/
 │   │   ├── components/
 │   │   ├── pages/
 │   │   ├── hooks/
 │   │   ├── services/
 │   │   └── styles/
 ├── server/ (Node backend)
 │   ├── controllers/
 │   ├── routes/
 │   ├── models/
 │   ├── sockets/
 │   ├── middleware/
 │   ├── config/
 └── README.md
```

## Features

- Signup / login with JWT authentication
- Protected dashboard and meeting room routes
- Create and join meetings via room link
- WebRTC video conferencing with multiple participants
- Screen sharing using `getDisplayMedia`
- Real-time chat powered by Socket.IO
- Host controls: mute, remove, lock meeting
- Raise hand feature
- Responsive UI with Tailwind CSS

## Setup Instructions

### 1. Backend

1. Open `server/` directory.
2. Copy `.env.example` to `.env`.
3. Fill in your values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT`
4. Install dependencies:

```bash
cd server
npm install
```

5. Start backend:

```bash
npm run dev
```

### 2. Frontend

1. Open `client/` directory.
2. Copy `.env.example` to `.env` and adjust `VITE_SERVER_URL` if needed.
3. Install dependencies:

```bash
cd client
npm install
```

4. Start frontend:

```bash
npm run dev
```

### 3. MongoDB Connection

Use MongoDB Atlas or a local MongoDB instance. Set `MONGODB_URI` in `server/.env`.

Example Atlas URI:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/divmeeting?retryWrites=true&w=majority
```

## Deployment Guide

### Frontend (Vercel)

1. Push `client/` to a GitHub repository.
2. Create a new Vercel project and point it at the repo.
3. Set environment variable:
   - `VITE_SERVER_URL=https://<your-backend-url>`
4. Use build command: `npm run build`.
5. Output directory: `dist`.

### Backend (Render)

1. Push `server/` to a GitHub repository.
2. Create a new Render Web Service.
3. Set environment variables:
   - `PORT=5000`
   - `MONGODB_URI`
   - `JWT_SECRET`
4. Start command: `npm start`.

### MongoDB Atlas

- Create a cluster in Atlas.
- Add your server's IP address or allow access from anywhere.
- Create a database user and copy the connection string.
- Paste it into `server/.env`.

## Notes

- Frontend uses `VITE_SERVER_URL` from `.env`.
- Backend Socket.IO authentication uses JWT in `socket.handshake.auth.token`.
- Use `npm run dev` in both `client` and `server` for local development.
