package db

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStartSSHTunnel_InvalidKeyPath(t *testing.T) {
	cfg := SSHTunnelConfig{
		BastionHost:    "localhost:22",
		BastionUser:    "user",
		PrivateKeyPath: "/invalid/path/to/key",
		RemoteHost:     "remote.db",
		RemotePort:     "5432",
		LocalPort:      "15432",
	}

	err := StartSSHTunnel(cfg)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read private key")
}
