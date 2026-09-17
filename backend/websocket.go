package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")

        return origin == "http://localhost:5173" ||
            origin == "http://localhost:5174" ||
            origin == "https://hcl-guvi-live-poll-frontend.onrender.com"
    },
}

func pollWebSocket(c *gin.Context) {

	pollID := c.Param("id")

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Redis channel for this poll
	channel := "poll:" + pollID + ":updates"

	pubsub := redisClient.Subscribe(context.Background(), channel)
	defer pubsub.Close()

	// Listen for Redis updates
	for {
		message, err := pubsub.ReceiveMessage(context.Background())

		if err != nil {
			return
		}

		// Send Redis message to browser
		err = conn.WriteMessage(
			websocket.TextMessage,
			[]byte(message.Payload),
		)

		if err != nil {
			return
		}
	}
}