# HCL GUVI Live Poll

A real-time polling application where authenticated users can create polls, share poll links, vote, and see results update live without refreshing the page.

## Live Application

**Frontend:** https://hcl-guvi-live-poll-frontend.onrender.com

**Backend API:** https://hcl-guvi-live-poll.onrender.com

## Features

* User registration and login
* JWT-based authentication
* Protected poll creation
* Create polls with multiple options
* Backend input validation
* Share polls using a unique link
* Public poll voting
* Real-time result updates without page refresh
* Redis-based real-time vote counting
* Redis Pub/Sub for live event communication
* WebSocket-based live updates
* WebSocket reconnection handling
* MongoDB for persistent poll and user data
* Deployed frontend and backend

## Technology Stack

### Frontend

* React
* Vite
* React Router
* JavaScript

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
4. The poll link can be shared with other users.
5. Users open the link and vote.
6. The vote is stored in MongoDB.
7. Redis updates the live vote count.
8. Redis Pub/Sub publishes the vote update.
9. The Go WebSocket server sends the update to connected clients.
10. React receives the WebSocket update and updates the results automatically without refreshing the page.

## Backend Validation

The backend validates poll creation and voting requests before processing them.

Validation includes:

* Required question and options
* Question length limits
* Minimum and maximum number of options
* Empty option validation
* Maximum option length
* Duplicate option prevention
* Validation against invalid MongoDB field-path characters
* Poll ID validation
* Validation of selected voting options

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

**Do not commit `.env` files, passwords, or other secrets to GitHub.**

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
WebSocket Server
    ↓
Connected Users
    ↓
Live Results
```

Redis is used for live vote counting and Pub/Sub messaging, while WebSockets deliver vote updates to connected clients in real time.

## Deployment

The application is deployed as separate frontend and backend services using Render.

* Frontend: Render Static Site
* Backend: Render Web Service
* MongoDB: MongoDB Atlas
* Redis: Redis Cloud

## AI Assistance

AI tools were used during development to support implementation, debugging, and learning.

AI assistance was used for:

* Understanding React, Go, Gin, MongoDB, Redis, and WebSockets
* Debugging connection, CORS, and deployment issues
* Improving backend validation and error handling
* Understanding Redis Pub/Sub and real-time communication
* Reviewing code and suggesting implementation improvements

The application was tested and integrated manually, and the developer reviewed the implementation to understand the application's end-to-end flow.

```

### One small thing, bro

Your current README says:

> "The vote is stored in MongoDB → Redis updates..."

That's okay for describing your current implementation.

I **would not add** claims such as:

> "Each user can vote only once"

because we already tested that refreshing can bypass the current browser-based protection.

So the README above stays accurate to what you've actually demonstrated. 👍

After replacing the README, **save it and push it to GitHub**. Since this is only documentation, it won't affect your deployed application.
```
