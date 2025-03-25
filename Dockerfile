# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . ./
RUN go build -o sql-mcp-server ./cmd/main.go

FROM alpine:latest

WORKDIR /root/
COPY --from=builder /app/sql-mcp-server .
COPY .env.example .env

CMD ["./sql-mcp-server"]
