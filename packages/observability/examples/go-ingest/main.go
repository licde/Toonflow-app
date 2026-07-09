package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

func main() {
	ingest := os.Getenv("TOONFLOW_LOG_INGEST")
	if ingest == "" {
		ingest = "http://localhost:10588/api/logs/ingest"
	}
	token := os.Getenv("TOONFLOW_TOKEN")
	event := map[string]any{
		"level":    "error",
		"category": "system",
		"message":  "simulated failure from go",
		"traceId":  "demo-trace-go",
	}
	body, _ := json.Marshal(event)
	req, _ := http.NewRequest("POST", ingest, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()
	fmt.Println("status", res.StatusCode)
}
