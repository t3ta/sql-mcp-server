# SQL MCP Server (TypeScript)

[![TypeScript](https://img.shields.io/badge/TypeScript-4.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Build](https://github.com/your-org/sql-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/sql-mcp-server/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-CLI-lightgrey.svg)]()

This project provides a **TypeScript implementation** of a Model Context Protocol (MCP) server that enables language models and other MCP-compatible clients to query PostgreSQL databases—via SSH bastion tunnels when required.

Built for flexibility and secure database access, it supports AWS RDS with read-only transactions and uses stdin/stdout-based communication, making it suitable for local, containerized, or AI-driven use cases.

## Features

- 🔒 SSH bastion support for secure access to private RDS instances via SSH tunnels
- 🐘 PostgreSQL read-only query engine using the `pg` library
- 📡 STDIO-based MCP protocol transport
- 🧠 Compatible with [memory-bank-mcp-server](https://github.com/memcloud-ai/memory-bank-mcp-server)
- ⚙️ Easily configurable via `.env` or environment variables
- 🧪 Fully testable with Jest and mocks

---

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/your-org/sql-mcp-server.git
cd sql-mcp-server
npm install
npm run build

Configuration (Optional .env file)

Create a .env file in the project root:

DB_USER=postgres
DB_PASS=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydatabase
USE_SSH_TUNNEL=true
SSH_BASTION_HOST=bastion.example.com
SSH_BASTION_USER=ec2-user
SSH_PRIVATE_KEY_PATH=~/.ssh/id_rsa

Usage

Run the server using npx:

npx -y @modelcontextprotocol/server-postgres postgresql://<user>:<pass>@localhost:5433/<dbname>

For direct connection without SSH tunneling, set the appropriate environment variables:

DB_HOST=rds-host.amazonaws.com DB_PORT=5432 npx -y @modelcontextprotocol/server-postgres postgresql://<user>:<pass>@rds-host.amazonaws.com/<dbname>

Sample Input

{
  "type": "call_tool",
  "params": {
    "name": "query",
    "arguments": {
      "sql": "SELECT * FROM users LIMIT 10"
    }
  }
}

Sample Output

{
  "content": [
    {
      "type": "text",
      "text": "[{\"id\":1,\"name\":\"Alice\"}]"
    }
  ],
  "isError": false
}



⸻

Related Docs
	•	Architecture
	•	Domain Models
	•	Glossary
	•	Coding Standards
	•	Tech Stack
	•	User Guide

⸻

License

MIT

⸻

Contribution Guide

We welcome community contributions! Please see CONTRIBUTING.md for details.

⸻

Compatibility

This implementation follows the Model Context Protocol (MCP) and has been tested for compatibility with:
	•	memory-bank-mcp-server
	•	Claude Desktop (via STDIO)
	•	Cursor IDE
	•	Supabase + MCP integration

```
