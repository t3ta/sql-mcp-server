package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Client struct {
	pool *pgxpool.Pool
}

func NewClient(ctx context.Context, dsn string) (*Client, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx pool: %w", err)
	}
	return &Client{pool: pool}, nil
}

func (c *Client) Query(ctx context.Context, sql string) ([]map[string]any, error) {
	rows, err := c.pool.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldDescriptions := rows.FieldDescriptions()
	results := []map[string]any{}

	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}

		rowMap := map[string]any{}
		for i, val := range values {
			colName := string(fieldDescriptions[i].Name)
			rowMap[colName] = val
		}
		results = append(results, rowMap)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no rows returned")
	}

	return results, nil
}

func (c *Client) Close() {
	c.pool.Close()
}
