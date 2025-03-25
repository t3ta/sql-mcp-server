# Contributing to SQL MCP Server (Go)

First off, thank you for considering contributing to this project — we appreciate it! 💖

This project implements a Go-based [Model Context Protocol (MCP)](https://modelcontextprotocol.dev/) server compatible with [`memory-bank-mcp-server`](https://github.com/memcloud-ai/memory-bank-mcp-server). It enables read-only access to SQL databases like PostgreSQL (via AWS RDS), with optional SSH bastion tunneling and JSON-over-STDIO communication.

## Getting Started

1. **Clone the repo**

   ```bash
   git clone https://github.com/your-org/sql-mcp-server.git
   cd sql-mcp-server
   ```

2. **Set up your environment**

   - Configure using `.env` or pass environment variables
   - If using SSH tunneling, configure your bastion and key file

3. **Build the project**
   ```bash
   go build -o sql-mcp-server
   ```

---

## How to Contribute

We welcome all kinds of contributions, including:

- 🐛 Bug reports and fixes
- ✨ Feature suggestions or implementations (e.g., support for MySQL)
- 📄 Documentation improvements
- 🧪 Additional unit/integration tests

---

## Coding Guidelines

- Follow the [coding standards](./mcp-server-go-coding-standards.json)
- Use idiomatic Go (GoDoc comments, short functions, early returns)
- Organize code into layered modules: `cmd/`, `mcp/`, `db/`, `transport/`, etc.
- Keep one function/purpose per file if possible
- Add meaningful commit messages 🙏

---

## Testing

Run all tests with:

```bash
go test ./...
```

- Use `sqlmock` for database mocking
- Use `httptest` for stdio-like mocking if needed
- Aim for >90% test coverage on core logic

---

## MCP Protocol Compatibility

If you’re implementing or changing protocol logic:

- Conform to the MCP message format (`type`, `params`, etc.)
- Test with [`memory-bank-mcp-server`](https://github.com/memcloud-ai/memory-bank-mcp-server)
- Add/update domain model if introducing new tools or structures

---

## Communication

- Open an issue for major changes before PRs
- Keep PRs focused and scoped
- Respect existing coding structure and style

---

## License

By contributing, you agree to license your work under the same terms as the project: [MIT](./LICENSE).

---

Thanks again, and happy contributing! 🚀
