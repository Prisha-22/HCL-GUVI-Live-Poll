package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

type Poll struct {
	ID        bson.ObjectID  `json:"id" bson:"_id,omitempty"`
	Question  string         `json:"question" bson:"question"`
	Options   []string       `json:"options" bson:"options"`
	Votes     map[string]int `json:"votes" bson:"votes"`
	CreatedBy string         `json:"createdBy" bson:"createdBy"`
	CreatedAt time.Time      `json:"createdAt" bson:"createdAt"`
	ExpiresAt time.Time      `json:"expiresAt" bson:"expiresAt"`
}

type CreatePollRequest struct {
	Question  string    `json:"question" binding:"required,min=3,max=200"`
	Options   []string  `json:"options" binding:"required,min=2,max=10"`
	ExpiresAt time.Time `json:"expiresAt" binding:"required"`
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

	request.Question = strings.TrimSpace(request.Question)

	if request.Question == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Question cannot be empty",
		})
		return
	}

	seen := make(map[string]bool)

	for i := range request.Options {

		request.Options[i] = strings.TrimSpace(request.Options[i])

		if request.Options[i] == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Options cannot be empty",
			})
			return
		}

		if len(request.Options[i]) > 100 {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Each option must be 100 characters or less",
			})
			return
		}

		if strings.Contains(request.Options[i], ".") ||
			strings.HasPrefix(request.Options[i], "$") {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Options cannot contain '.' or start with '$'",
			})
			return
		}

		if seen[request.Options[i]] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Duplicate options are not allowed",
			})
			return
		}

		seen[request.Options[i]] = true
	}

	if request.ExpiresAt.IsZero() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Expiry date and time is required",
		})
		return
	}

	if !request.ExpiresAt.After(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Expiry date and time must be in the future",
		})
		return
	}

	votes := make(map[string]int)

	for _, option := range request.Options {
		votes[option] = 0
	}

	userID, exists := c.Get("userId")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User information not found",
		})
		return
	}

	userIDString, ok := userID.(string)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid user information",
		})
		return
	}

	poll := Poll{
		ID:        bson.NewObjectID(),
		Question:  request.Question,
		Options:   request.Options,
		Votes:     votes,
		CreatedBy: userIDString,
		CreatedAt: time.Now(),
		ExpiresAt: request.ExpiresAt,
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	_, err := pollCollection.InsertOne(ctx, poll)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not create poll",
		})
		return
	}

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

func getMyPolls(c *gin.Context) {

	userID, exists := c.Get("userId")

	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User information not found",
		})
		return
	}

	userIDString, ok := userID.(string)

	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid user information",
		})
		return
	}

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	cursor, err := pollCollection.Find(
		ctx,
		bson.M{"createdBy": userIDString},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not get your polls",
		})
		return
	}

	defer cursor.Close(ctx)

	var polls []Poll

	if err := cursor.All(ctx, &polls); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not read your polls",
		})
		return
	}

	if polls == nil {
		polls = []Poll{}
	}

	c.JSON(http.StatusOK, polls)
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

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	err = pollCollection.FindOne(
		ctx,
		bson.M{"_id": pollID},
	).Decode(&poll)

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

func getVoteStatus(c *gin.Context) {

	id := c.Param("id")

	pollID, err := bson.ObjectIDFromHex(id)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid poll ID",
		})
		return
	}

	voterID := c.GetHeader("X-Voter-ID")

	if voterID == "" {
		voterID, err = c.Cookie("voter_id")

		if err != nil || voterID == "" {
			c.JSON(http.StatusOK, gin.H{
				"voted": false,
			})
			return
		}
	}

	voterKey := "poll:" + pollID.Hex() + ":voters"

	voted, err := redisClient.SIsMember(
		context.Background(),
		voterKey,
		voterID,
	).Result()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not check vote status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"voted": voted,
	})
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

	var poll Poll

	ctx, cancel := context.WithTimeout(
		context.Background(),
		5*time.Second,
	)
	defer cancel()

	err = pollCollection.FindOne(
		ctx,
		bson.M{"_id": pollID},
	).Decode(&poll)

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

	// Check whether the poll has expired.
	if !poll.ExpiresAt.IsZero() &&
		!time.Now().Before(poll.ExpiresAt) {

		c.JSON(http.StatusForbidden, gin.H{
			"error": "This poll has ended",
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

	request.Option = strings.TrimSpace(request.Option)

	if request.Option == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Option is required",
		})
		return
	}

	if strings.Contains(request.Option, ".") ||
		strings.HasPrefix(request.Option, "$") {

		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid option",
		})
		return
	}

	voterID := c.GetHeader("X-Voter-ID")

	if voterID == "" {

		voterID, err = c.Cookie("voter_id")

		if err != nil || voterID == "" {

			voterID = bson.NewObjectID().Hex()

			secure := c.Request.TLS != nil

			c.SetSameSite(http.SameSiteNoneMode)

			c.SetCookie(
				"voter_id",
				voterID,
				60*60*24*365,
				"/",
				"",
				secure,
				true,
			)
		}
	}

	voterKey := "poll:" + pollID.Hex() + ":voters"

	exists, err := redisClient.SIsMember(
		context.Background(),
		voterKey,
		voterID,
	).Result()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not check vote status",
		})
		return
	}

	if exists {
		c.JSON(http.StatusConflict, gin.H{
			"error": "You have already voted in this poll",
		})
		return
	}

	// Record the vote in MongoDB.
	// We reuse the existing ctx created above.
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

	// Update the live vote count in Redis.
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

	fmt.Println(
		"Redis live count:",
		request.Option,
		newCount,
	)

	// Save voter ID in Redis to prevent duplicate voting.
	err = redisClient.SAdd(
		context.Background(),
		voterKey,
		voterID,
	).Err()

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Could not save vote status",
		})
		return
	}

	// Publish live update through Redis Pub/Sub.
	updateChannel := "poll:" + pollID.Hex() + ":updates"

	err = redisClient.Publish(
		context.Background(),
		updateChannel,
		fmt.Sprintf(
			`{"option":"%s","count":%d}`,
			request.Option,
			newCount,
		),
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