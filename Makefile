BINARY_NAME=sql-mcp-server
CMD_DIR=./cmd

.PHONY: build clean test run lint release snapshot

build:
	go build -o $(BINARY_NAME) $(CMD_DIR)/main.go

clean:
	rm -f $(BINARY_NAME)

test:
	go test ./...

run:
	go run $(CMD_DIR)/main.go

lint:
	go vet ./...

release:
	goreleaser release --clean

snapshot:
goreleaser release --snapshot --clean

docker:
	docker build -t sql-mcp-server .
