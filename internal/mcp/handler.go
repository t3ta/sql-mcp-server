package mcp

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"strings"
)

type DBClient interface {
	Query(ctx context.Context, sql string) ([]map[string]any, error)
}

// HandleCallTool handles an MCP 'call_tool' request and writes a response to the output.
func HandleCallTool(w io.Writer, db DBClient, req MCPRequest) error {
	var params CallToolParams
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return writeError(w, req.ID, "invalid parameters: "+err.Error())
	}

	if params.Name != "query" {
		return writeError(w, req.ID, "unsupported tool: "+params.Name)
	}

	sqlStr, ok := params.Arguments["sql"].(string)
	if !ok || sqlStr == "" {
		return writeError(w, req.ID, "missing or invalid 'sql' argument")
	}

	rows, err := db.Query(context.Background(), sqlStr)
	if err != nil {
		return writeError(w, req.ID, err.Error())
	}

	out, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return writeError(w, req.ID, "failed to encode result: "+err.Error())
	}

	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      req.ID,
		Result: map[string]any{
			"content": []map[string]string{
				{"type": "text", "text": string(out)},
			},
		},
	}

	return json.NewEncoder(w).Encode(resp)
}

// HandleInitialize responds to an MCP "initialize" request with declared capabilities.
func HandleInitialize(w io.Writer, id int) error {
	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      id,
		Result: map[string]any{
			"capabilities": map[string]any{
				"list_tools":     true,
				"call_tool":      true,
				"list_resources": true,
				"read_resource":  true,
			},
		},
	}
	return json.NewEncoder(w).Encode(resp)
}

func writeError(w io.Writer, id int, msg string) error {
	log.Printf("MCP error: %s", msg)
	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      id,
		Error: &RPCError{
			Code:    -32000,
			Message: msg,
		},
	}
	return json.NewEncoder(w).Encode(resp)
}

// HandleListResources queries the list of tables from the database and writes them as an MCP response.
func HandleListResources(w io.Writer, db DBClient, id int) error {
	const query = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"

	rows, err := db.Query(context.Background(), query)
	if err != nil {
		return writeError(w, id, err.Error())
	}

	out, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return writeError(w, id, "failed to encode result: "+err.Error())
	}

	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      id,
		Result: map[string]any{
			"content": []map[string]string{
				{"type": "text", "text": string(out)},
			},
		},
	}
	return json.NewEncoder(w).Encode(resp)
}

// HandleListTools returns a list of available MCP tools.
func HandleListTools(w io.Writer, id int) error {
	tools := []map[string]any{
		{
			"name":        "query",
			"description": "Execute a read-only SQL query",
			"inputSchema": map[string]any{
				"type":       "object",
				"properties": map[string]any{"sql": map[string]any{"type": "string"}},
				"required":   []string{"sql"},
			},
		},
	}

	out, err := json.MarshalIndent(tools, "", "  ")
	if err != nil {
		return writeError(w, id, "failed to encode tools: "+err.Error())
	}

	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      id,
		Result: map[string]any{
			"content": []map[string]string{
				{"type": "text", "text": string(out)},
			},
		},
	}
	return json.NewEncoder(w).Encode(resp)
}

// HandleReadResource retrieves schema details for a given table.
func HandleReadResource(w io.Writer, db DBClient, req MCPRequest, id int) error {
	var params struct {
		URI string `json:"uri"`
	}
	if err := json.Unmarshal(req.Params, &params); err != nil {
		return writeError(w, id, "invalid parameters: "+err.Error())
	}

	parts := strings.Split(strings.Trim(params.URI, "/"), "/")
	if len(parts) < 2 || parts[1] != "schema" {
		return writeError(w, id, "invalid resource URI")
	}
	table := parts[0]

	query := "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1"
	sql := strings.Replace(query, "$1", "'"+table+"'", 1) // naive bind to support mock interface

	rows, err := db.Query(context.Background(), sql)
	if err != nil {
		return writeError(w, id, err.Error())
	}

	out, err := json.MarshalIndent(rows, "", "  ")
	if err != nil {
		return writeError(w, id, "failed to encode result: "+err.Error())
	}

	resp := JSONRPCResponse{
		JsonRPC: "2.0",
		ID:      id,
		Result: map[string]any{
			"content": []map[string]string{
				{"type": "text", "text": string(out)},
			},
		},
	}
	return json.NewEncoder(w).Encode(resp)
}
