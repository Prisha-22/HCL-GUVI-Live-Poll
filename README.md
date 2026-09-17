# HCL GUVI Live Poll

A real-time polling application where users can create polls, share poll links, vote, and see results update live without refreshing the page.

## Live Application

Frontend: https://hcl-guvi-live-poll-frontend.onrender.com

Backend API: https://hcl-guvi-live-poll.onrender.com

## Features

* User registration and login
* JWT-based authentication
* Create polls with multiple options
* Share polls using a unique link
* Public poll voting
* Real-time result updates
* MongoDB for persistent poll and user data
* Redis for real-time vote counts and Pub/Sub
* WebSocket-based live updates
* Deployed frontend and backend

## Technology Stack

### Frontend

* React
* Vite
* React Router

### Backend

* Go
* Gin
* JWT
* WebSocket

### Database

* MongoDB Atlas

### Real-Time

* Redis Cloud
* Redis Pub/Sub
* WebSocket

### Deployment

* Render

## Project Structure

```text
HCL-GUVI-Live-Poll/
├── backend/
│   ├── main.go
│   ├── auth.go
│   ├── middleware.go
│   ├── poll.go
│   ├── websocket.go
│   └── go.mod
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## How It Works

1. A user registers and logs in.
2. The authenticated user creates a poll.
3. The poll receives a unique link.
4. Other users open the link and vote.
5. The vote is stored in MongoDB.
6. Redis updates the real-time vote count.
7. Redis Pub/Sub publishes the vote update.
8. The Go WebSocket server sends the update to connected clients.
9. Results update automatically without refreshing the page.

## Environment Variables

The application uses environment variables for sensitive configuration.

Example:

```text
MONGO_URI=your_mongodb_connection_string
REDIS_ADDR=your_redis_host_and_port
REDIS_USERNAME=your_redis_username
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_jwt_secret
PORT=8080
```

**Do not commit `.env` files or passwords to GitHub.**

## Running Locally

### Backend

```bash
cd backend
go run .
```

The backend runs on:

```text
http://localhost:8080
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Real-Time Architecture

```text
User votes
    ↓
React Frontend
    ↓
Go / Gin API
    ↓
MongoDB
    ↓
Redis
    ↓
Redis Pub/Sub
    ↓
WebSocket
    ↓
Connected Users
    ↓
Live Results
```

## Deployment

The frontend and backend are deployed separately using Render.

* Frontend: Render Static Site
* Backend: Render Web Service
* MongoDB: MongoDB Atlas
* Redis: Redis Cloud
