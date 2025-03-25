package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoadDSN(t *testing.T) {
	t.Setenv("DB_USER", "testuser")
	t.Setenv("DB_PASS", "testpass")
	t.Setenv("DB_HOST", "localhost")
	t.Setenv("DB_PORT", "5432")
	t.Setenv("DB_NAME", "testdb")

	dsn, err := LoadDSN()
	assert.NoError(t, err)
	assert.Equal(t, "postgres://testuser:testpass@localhost:5432/testdb", dsn)
}

func TestLoadDSN_Missing(t *testing.T) {
	os.Unsetenv("DB_USER")
	os.Unsetenv("DB_PASS")
	os.Unsetenv("DB_HOST")
	os.Unsetenv("DB_PORT")
	os.Unsetenv("DB_NAME")

	_, err := LoadDSN()
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "some DB env vars are missing")
}
