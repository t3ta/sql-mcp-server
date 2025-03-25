package mcp

import "encoding/json"

// MCPRequest represents a JSON-RPC MCP request with method and params.
type MCPRequest struct {
	JsonRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params"`
	ID      int             `json:"id"`
}

// CallToolParams defines the structure expected when type is "call_tool".
type CallToolParams struct {
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// MCPResponse is the standard response returned by MCP handlers.
type MCPResponse struct {
	Content []MCPContent `json:"content"`
	IsError bool         `json:"isError"`
}

// MCPContent is a single response content block.
type MCPContent struct {
	Type string `json:"type"` // usually "text"
	Text string `json:"text"`
}

// JSONRPCResponse represents a proper JSON-RPC 2.0 response.
type JSONRPCResponse struct {
	JsonRPC string      `json:"jsonrpc"`
	ID      int         `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

// RPCError represents a JSON-RPC 2.0 error object.
type RPCError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}
