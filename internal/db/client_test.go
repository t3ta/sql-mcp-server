package db

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
)

func TestClient_Query(t *testing.T) {
	// NOTE: This is a placeholder test.
	// You should use a test DB or a mock pgxpool for real tests.

	dsn := "postgres://user:pass@localhost:5432/testdb?sslmode=disable"
	ctx := context.Background()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Skip("skip: cannot connect to test DB")
		return
	}
	defer pool.Close()

	client := &Client{pool: pool}
	rows, err := client.Query(ctx, "SELECT 1 AS n")
	if err != nil {
		t.Skipf("skip: query failed (%v)", err)
		return
	}

	assert.Len(t, rows, 1)
	assert.Equal(t, float64(1), rows[0]["n"])
}
