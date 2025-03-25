package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/t3ta/sql-mcp-server/internal/config"
	"github.com/t3ta/sql-mcp-server/internal/db"
	"github.com/t3ta/sql-mcp-server/internal/mcp"
)

func Run(input io.Reader, output io.Writer, dbClient mcp.DBClient) error {
	decoder := json.NewDecoder(input)

	for {
		var req mcp.MCPRequest
		if err := decoder.Decode(&req); err != nil {
			log.Printf("failed to decode input: %v", err)
			continue
		}

		switch req.Method {
		case "call_tool":
			if err := mcp.HandleCallTool(output, dbClient, req); err != nil {
				log.Printf("handler error: %v", err)
			}
		case "list_resources":
			if err := mcp.HandleListResources(output, dbClient, req.ID); err != nil {
				log.Printf("handler error: %v", err)
			}
		case "list_tools":
			if err := mcp.HandleListTools(output, req.ID); err != nil {
				log.Printf("handler error: %v", err)
			}
		case "read_resource":
			if err := mcp.HandleReadResource(output, dbClient, req, req.ID); err != nil {
				log.Printf("handler error: %v", err)
			}
		case "initialize":
			if err := mcp.HandleInitialize(output, req.ID); err != nil {
				log.Printf("handler error: %v", err)
			}
		default:
			log.Printf("unsupported request type: %s", req.Method)
		}
	}
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or failed to load")
	}

	dsn, err := config.LoadDSN()
	if err != nil {
		log.Fatal(err)
	}

	ctx := context.Background()
	client, err := db.NewClient(ctx, dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer client.Close()

	if err := Run(os.Stdin, os.Stdout, client); err != nil {
		log.Fatal(err)
	}
}
