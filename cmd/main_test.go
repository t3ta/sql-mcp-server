package main

import (
	"bytes"
	"context"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
)

// mockDBClient implements mcp.DBClient with no-op methods
type mockDBClient struct{}

func (m *mockDBClient) Query(_ context.Context, _ string) ([]map[string]any, error) {
	return nil, nil
}

func TestRun_ListTools(t *testing.T) {
	input := `{"jsonrpc":"2.0","id":1,"method":"list_tools","params":{}}`
	in := strings.NewReader(input)
	var out bytes.Buffer
	client := &mockDBClient{}

	err := Run(in, &out, client)
	assert.NoError(t, err)

	output := out.String()
	assert.Contains(t, output, `"name": "query"`)
	assert.Contains(t, output, `"description": "Execute a read-only SQL query"`)
}
