package transport

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestTransport_ReadWrite(t *testing.T) {
	input := bytes.NewBuffer(nil)
	output := bytes.NewBuffer(nil)

	tp := &StdioTransport{
		in:  input,
		out: output,
	}

	// Write a sample JSON message
	message := map[string]any{
		"type": "test",
		"data": "hello",
	}
	err := tp.Write(message)
	assert.NoError(t, err)

	// Check that the message was written correctly
	var decoded map[string]any
	err = json.Unmarshal(output.Bytes(), &decoded)
	assert.NoError(t, err)
	assert.Equal(t, message["type"], decoded["type"])
	assert.Equal(t, message["data"], decoded["data"])

	// Prepare a read input
	input.Reset()
	output.Reset()

	inputMessage := map[string]any{
		"type": "input_test",
		"data": "world",
	}
	encoded, _ := json.Marshal(inputMessage)
	input.Write(encoded)

	var result map[string]any
	err = tp.Read(&result)
	assert.NoError(t, err)
	assert.Equal(t, inputMessage["type"], result["type"])
	assert.Equal(t, inputMessage["data"], result["data"])
}
