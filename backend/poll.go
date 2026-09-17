package main

import (
	"context"
	"net/http"
	"time"
	"fmt"
	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Poll struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Question  string        `json:"question" bson:"question"`
	Options   []string      `json:"options" bson:"options"`
	Votes     map[string]int `json:"votes" bson:"votes"`
	CreatedAt time.Time     `json:"createdAt" bson:"createdAt"`
}

type CreatePollRequest struct {
	Question string   `json:"question"`
	Options  []string `json:"options"`
}

var pollCollection *mongo.Collection

func createPoll(c *gin.Context) {

	var request CreatePollRequest

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
		})
		return
	}

	if request.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question is required",
		})
		return
	}

	if len(request.Options) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least 2 options are required",
		})
		return
	}

	votes := make(map[string]int)

	for _, option := range request.Options {
		votes[option] = 0
	}

	poll := Poll{
		ID:        bson.NewObjectID(),
		Question:  request.Question,
		Options:   request.Options,
		Votes:     votes,
		CreatedAt: time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err := pollCollection.InsertOne(ctx, poll)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not create poll",
		})
		return
	}
	// Initialize live vote counts in Redis
	redisKey := "poll:" + poll.ID.Hex() + ":votes"

	for _, option := range poll.Options {
		err := redisClient.HSet(
			context.Background(),
			redisKey,
			option,
			0,
		).Err()

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Could not initialize Redis",
			})
			return
		}
	}

	c.JSON(http.StatusCreated, poll)
}

func getPoll(c *gin.Context) {

	id := c.Param("id")

	pollID, err := bson.ObjectIDFromHex(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	var poll Poll

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = pollCollection.FindOne(ctx, bson.M{"_id": pollID}).Decode(&poll)

	if err != nil {
		if err == mongo.ErrNoDocuments {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Poll not found",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not get poll",
		})
		return
	}

	c.JSON(http.StatusOK, poll)
}

func votePoll(c *gin.Context) {

	id := c.Param("id")

	pollID, err := bson.ObjectIDFromHex(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	var request struct {
		Option string `json:"option"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request",
		})
		return
	}

	if request.Option == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Option is required",
		})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := pollCollection.UpdateOne(
		ctx,
		bson.M{
			"_id":     pollID,
			"options": request.Option,
		},
		bson.M{
			"$inc": bson.M{
				"votes." + request.Option: 1,
			},
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not record vote",
		})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Poll or option not found",
		})
		return
	}

	// Update live vote count in Redis
	redisKey := "poll:" + pollID.Hex() + ":votes"

	newCount, err := redisClient.HIncrBy(
		context.Background(),
		redisKey,
		request.Option,
		1,
	).Result()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not update Redis",
		})
		return
	}

	fmt.Println("Redis live count:", request.Option, newCount)

	// Publish live update to WebSocket clients
	updateChannel := "poll:" + pollID.Hex() + ":updates"

	err = redisClient.Publish(
		context.Background(),
		updateChannel,
		fmt.Sprintf(`{"option":"%s","count":%d}`, request.Option, newCount),
	).Err()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not publish live update",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Vote recorded successfully",
	})
}