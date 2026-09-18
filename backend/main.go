package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

var redisClient *redis.Client

func main() {

	// Load .env file
	err := godotenv.Load()
	if err != nil {
		fmt.Println("No .env file found, using environment variables")
	}

	// =========================
	// MongoDB CONNECTION
	// =========================

	mongoURI := os.Getenv("MONGO_URI")

	if mongoURI == "" {
		fmt.Println("MONGO_URI is missing")
		return
	}

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		fmt.Println("MongoDB connection error:", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err = client.Ping(ctx, nil)
	if err != nil {
		fmt.Println("MongoDB ping failed:", err)
		return
	}

	fmt.Println("MongoDB connected successfully!")

	// Select MongoDB collection
	pollCollection = client.Database("livepoll").Collection("polls")
	userCollection = client.Database("livepoll").Collection("users")
	// =========================
	// REDIS CONNECTION
	// =========================

	redisAddr := os.Getenv("REDIS_ADDR")
	redisUsername := os.Getenv("REDIS_USERNAME")
	redisPassword := os.Getenv("REDIS_PASSWORD")

	if redisAddr == "" || redisPassword == "" {
		fmt.Println("Redis configuration is missing")
		return
	}

	redisClient = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Username: redisUsername,
		Password: redisPassword,
	})

	// Test Redis connection
	redisCtx, redisCancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer redisCancel()

	_, err = redisClient.Ping(redisCtx).Result()

	if err != nil {
		fmt.Println("Redis ping failed:", err)
		return
	}

	fmt.Println("Redis connected successfully!")

	// =========================
	// GIN ROUTER
	// =========================

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"https://hcl-guvi-live-poll-frontend.onrender.com",
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Test API
	router.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Live Poll API is running!",
		})
	})

	// Poll APIs
	router.POST("/polls", authMiddleware(), createPoll)
	router.GET("/polls/mine", authMiddleware(), getMyPolls)

	router.GET("/polls/:id/vote-status", getVoteStatus)
	router.GET("/polls/:id", getPoll)

	router.POST("/polls/:id/vote", votePoll)
	router.GET("/ws/polls/:id", pollWebSocket)
	router.POST("/register", registerUser)
	router.POST("/login", loginUser)

	// Start server
	port := os.Getenv("PORT")

	if port == "" {
		port = "8080"
	}

	router.Run(":" + port)
}