# SQL MCP Server (Go)

![Go](https://img.shields.io/badge/go-1.22+-00ADD8?logo=go)
![Build](https://github.com/your-org/sql-mcp-server/actions/workflows/ci.yml/badge.svg)
[![Go Report Card](https://goreportcard.com/badge/github.com/your-org/sql-mcp-server)](https://goreportcard.com/report/github.com/your-org/sql-mcp-server)
![MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Platform](https://img.shields.io/badge/platform-CLI-lightgrey)

This project provides a Go implementation of a Model Context Protocol (MCP) server that enables language models and other MCP-compatible clients to query PostgreSQL databases—via SSH bastion tunnels when required.

Built for flexibility and secure database access, it supports AWS RDS with read-only transactions and stdin/stdout-based communication, making it suitable for local, containerized, or AI-driven use cases.

## Features

- 🔒 SSH bastion support for secure access to private RDS instances
- 🐘 PostgreSQL read-only query engine using pgx
- 📡 STDIO-based MCP protocol transport
- 🧠 Compatible with [memory-bank-mcp-server](https://github.com/memcloud-ai/memory-bank-mcp-server)
- ⚙️ Easily configurable via `.env` or environment variables
- 🧪 Fully testable with mocks and table-driven tests

---

## Installation

```bash
git clone https://github.com/your-org/sql-mcp-server.git
cd sql-mcp-server
go build -o sql-mcp-server
```

## Configuration (Optional .env file)

```dotenv
DB_USER=postgres
DB_PASS=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydatabase
USE_SSH_TUNNEL=true
SSH_BASTION_HOST=bastion.example.com
SSH_BASTION_USER=ec2-user
SSH_PRIVATE_KEY_PATH=~/.ssh/id_rsa
```

## Usage

```bash
./sql-mcp-server
```

### Sample Input
```json
{
  "type": "call_tool",
  "params": {
    "name": "query",
    "arguments": {
      "sql": "SELECT * FROM users LIMIT 10"
    }
  }
}
```

### Sample Output
```json
{
  "content": [
    {
      "type": "text",
      "text": "[{\"id\":1,\"name\":\"Alice\"}]"
    }
  ],
  "isError": false
}
```

---

## Related Docs

- [Architecture](./mcp-server-go-architecture.json)
- [Domain Models](./mcp-server-go-domain-models.json)
- [Glossary](./mcp-server-go-glossary.json)
- [Coding Standards](./mcp-server-go-coding-standards.json)
- [Tech Stack](./mcp-server-go-tech-stack.json)
- [User Guide](./mcp-server-go-user-guide.json)

---

## License

MIT (or your license here)

---

## Contribution Guide

We welcome community contributions! Please see [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details.

---

## Compatibility

This implementation follows the [Model Context Protocol (MCP)](https://modelcontextprotocol.dev/) and has been tested for compatibility with:

- memory-bank-mcp-server
- Claude Desktop (via STDIO)
- Cursor IDE
- Supabase + MCP integration
