package transport

import (
	"encoding/json"
	"io"
	"os"
)

type StdioTransport struct {
	in  io.Reader
	out io.Writer
}

func NewStdioTransport() *StdioTransport {
	return &StdioTransport{
		in:  os.Stdin,
		out: os.Stdout,
	}
}

func (s *StdioTransport) Read(v interface{}) error {
	return json.NewDecoder(s.in).Decode(v)
}

func (s *StdioTransport) Write(v interface{}) error {
	return json.NewEncoder(s.out).Encode(v)
}
