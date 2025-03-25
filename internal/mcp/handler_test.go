package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
)

type mockDBClient struct {
	queryFunc func(ctx context.Context, sql string) ([]map[string]any, error)
}

func (m *mockDBClient) Query(ctx context.Context, sql string) ([]map[string]any, error) {
	return m.queryFunc(ctx, sql)
}

func TestHandleCallTool_Success(t *testing.T) {
	mock := &mockDBClient{
		queryFunc: func(ctx context.Context, sql string) ([]map[string]any, error) {
			assert.Equal(t, "SELECT * FROM users", sql)
			return []map[string]any{
				{"id": 1, "name": "Alice"},
			}, nil
		},
	}

	paramBytes, _ := json.Marshal(CallToolParams{
		Name: "query",
		Arguments: map[string]any{
			"sql": "SELECT * FROM users",
		},
	})
	req := MCPRequest{
		JsonRPC: "2.0",
		Method:  "call_tool",
		ID:      1,
		Params:  paramBytes,
	}

	var buf bytes.Buffer
	err := HandleCallTool(&buf, mock, req)
	assert.NoError(t, err)

	var res JSONRPCResponse
	err = json.Unmarshal(buf.Bytes(), &res)
	assert.NoError(t, err)
	assert.Nil(t, res.Error)
	body := res.Result.(map[string]any)
	content := body["content"].([]any)[0].(map[string]any)["text"].(string)
	assert.Contains(t, content, "Alice")
}

func TestHandleCallTool_Error(t *testing.T) {
	mock := &mockDBClient{
		queryFunc: func(ctx context.Context, sql string) ([]map[string]any, error) {
			return nil, errors.New("syntax error")
		},
	}

	paramBytes, _ := json.Marshal(CallToolParams{
		Name: "query",
		Arguments: map[string]any{
			"sql": "SELECT FROM",
		},
	})
	req := MCPRequest{
		JsonRPC: "2.0",
		Method:  "call_tool",
		ID:      1,
		Params:  paramBytes,
	}

	var buf bytes.Buffer
	err := HandleCallTool(&buf, mock, req)
	assert.NoError(t, err)

	var res JSONRPCResponse
	err = json.Unmarshal(buf.Bytes(), &res)
	assert.NoError(t, err)
	assert.NotNil(t, res.Error)
	assert.Contains(t, res.Error.Message, "syntax error")
}

func TestHandleListResources(t *testing.T) {
	mock := &mockDBClient{
		queryFunc: func(ctx context.Context, sql string) ([]map[string]any, error) {
			assert.Contains(t, sql, "information_schema.tables")
			return []map[string]any{
				{"table_name": "users"},
				{"table_name": "orders"},
			}, nil
		},
	}

	var buf bytes.Buffer
	err := HandleListResources(&buf, mock, 1)
	assert.NoError(t, err)

	var res JSONRPCResponse
	err = json.Unmarshal(buf.Bytes(), &res)
	assert.NoError(t, err)
	assert.Nil(t, res.Error)
	body := res.Result.(map[string]any)
	assert.Len(t, body["content"].([]any), 1)
	content := body["content"].([]any)[0].(map[string]any)["text"].(string)
	assert.Contains(t, content, "users")
	assert.Contains(t, content, "orders")
}

func TestHandleListTools(t *testing.T) {
	var buf bytes.Buffer
	err := HandleListTools(&buf, 1)
	assert.NoError(t, err)

	var res JSONRPCResponse
	err = json.Unmarshal(buf.Bytes(), &res)
	assert.NoError(t, err)
	assert.Nil(t, res.Error)
	body := res.Result.(map[string]any)
	assert.Len(t, body["content"].([]any), 1)
	content := body["content"].([]any)[0].(map[string]any)["text"].(string)
	assert.Contains(t, content, "query")
	assert.Contains(t, content, "inputSchema")
}

func TestHandleReadResource(t *testing.T) {
	mock := &mockDBClient{
		queryFunc: func(ctx context.Context, sql string) ([]map[string]any, error) {
			assert.Contains(t, sql, "information_schema.columns")
			assert.Contains(t, sql, "'users'")
			return []map[string]any{
				{"column_name": "id", "data_type": "integer"},
				{"column_name": "name", "data_type": "text"},
			}, nil
		},
	}

	req := MCPRequest{
		JsonRPC: "2.0",
		Method:  "read_resource",
		ID:      2,
		Params: json.RawMessage(`{
			"uri": "users/schema"
		}`),
	}

	var buf bytes.Buffer
	err := HandleReadResource(&buf, mock, req, 2)
	assert.NoError(t, err)

	var res JSONRPCResponse
	err = json.Unmarshal(buf.Bytes(), &res)
	assert.NoError(t, err)
	assert.Nil(t, res.Error)
	body := res.Result.(map[string]any)
	assert.Contains(t, body["content"].([]any)[0].(map[string]any)["text"].(string), "id")
	assert.Contains(t, body["content"].([]any)[0].(map[string]any)["text"].(string), "text")
}
