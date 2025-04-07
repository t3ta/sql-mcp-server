// src/mcp/handlers.ts
import type mysql from 'mysql2/promise';
import {
  // Request スキーマ自体をインポートして、その中の params の型を使う方針に変更
  type CallToolRequest,
  type ListResourcesResult,
  type ListToolsResult,
  type ReadResourceRequest, // RequestParams -> Request に変更
  type ReadResourceResult,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { getDbPool } from '../db.js';
import { dbName } from '../config.js';

// DBプールを取得 (ハンドラ内で使用)
function pool(): mysql.Pool {
    return getDbPool();
}

/**
 * ListResources リクエストハンドラ
 */
export async function handleListResources(): Promise<ListResourcesResult> {
  if (!dbName) {
    // TEMP: dbName が未定義の場合のエラーハンドリングを追加
    console.error('Database name (dbName) is not defined or imported correctly.');
    // エラーを投げるか、空の結果を返すか検討
    // throw new Error('Database name is not configured.');
    return { resources: [] };
  }

  try { // TEMP: DB操作全体を try...catch で囲む
    // information_schema からテーブルリストを取得
    // TEMP: query<T> を使用し、RowDataPacket[] を期待する型に変更
    const [rows] = await pool().query<mysql.RowDataPacket[]>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
      [dbName]
    );

    // TEMP: rows が配列であることをより確実にチェックし、string 型にキャスト
    const tables = Array.isArray(rows) ? rows.map(row => ({ table_name: row.table_name as string })) : [];

    return {
      resources: tables.map((row) => ({
        // uri と name に実際の DB 名とテーブル名を埋め込む
        uri: `mysql://${dbName}/${row.table_name}/schema`, // dbName を含める
        mimeType: 'application/json',
        name: `"${dbName}"."${row.table_name}" schema`, // dbName を含める
      })),
    };
  } catch (error) { // TEMP: エラーハンドリングを追加
    console.error('Error fetching resources:', error);
    // エラー発生時も空の結果を返すか、エラーを再スローするか検討
    // throw error;
    return { resources: [] };
  }
}

/**
 * ReadResource リクエストハンドラ (強化版)
 */
// 引数の型を ReadResourceRequest['params'] に変更
export async function handleReadResource(params: ReadResourceRequest['params']): Promise<ReadResourceResult> {
  const parts = new URL(params.uri).pathname.split('/');
  const tableName = parts[1];

  if (!dbName) {
    throw new Error('DB_NAME environment variable is not set.');
  }

  const connection = await pool().getConnection();

  try {
    // 1. カラム情報取得
    const [columns]: any = await connection.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = ? AND table_name = ?
      ORDER BY ordinal_position
    `, [dbName, tableName]);

    // 2. 主キー情報取得
    const [pk]: any = await connection.query(`
      SELECT k.column_name
      FROM information_schema.key_column_usage k
      JOIN information_schema.table_constraints t
      ON k.constraint_name = t.constraint_name AND k.table_schema = t.table_schema
      WHERE t.constraint_type = 'PRIMARY KEY'
        AND k.table_schema = ? AND k.table_name = ?
    `, [dbName, tableName]);
    const primaryKeys = pk.map((r: any) => r.column_name);

    // 3. 外部キー情報取得
    const [fks]: any = await connection.query(`
      SELECT
        k.column_name,
        k.referenced_table_name,
        k.referenced_column_name
      FROM information_schema.key_column_usage k
      JOIN information_schema.table_constraints t
      ON k.constraint_name = t.constraint_name AND k.table_schema = t.table_schema
      WHERE t.constraint_type = 'FOREIGN KEY'
        AND k.table_schema = ? AND k.table_name = ?
    `, [dbName, tableName]);

    // 4. 結果を整形
    const tableSchema = {
      name: tableName,
      columns: columns.map((col: any) => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        primaryKey: primaryKeys.includes(col.column_name),
      })),
      foreignKeys: fks.map((fk: any) => ({
        column: fk.column_name,
        references: {
          table: fk.referenced_table_name,
          column: fk.referenced_column_name,
        }
      })),
    };

    return {
      contents: [
        {
          uri: params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(tableSchema, null, 2),
        },
      ],
    };
  } finally {
    connection.release();
  }
}

/**
 * ListTools リクエストハンドラ
 */
export async function handleListTools(): Promise<ListToolsResult> {
  // ... (実装は変更なし) ...
  return {
    tools: [
      {
        name: 'query',
        // 説明を詳しく！
        description: 'Executes a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN) against the connected MySQL database. Returns the query results as a JSON string. Note: Write operations (INSERT, UPDATE, DELETE, etc.) are strictly prohibited and will result in an error.',
        inputSchema: {
          type: 'object',
          properties: {
            sql: {
              type: 'string',
              // こっちの説明もちょっと詳しく！
              description: 'The read-only SQL query to execute (e.g., "SELECT * FROM users LIMIT 10"). Only SELECT, SHOW, DESCRIBE, and EXPLAIN statements are allowed.'
            }
          },
          required: ['sql'],
        },
        // outputSchema も定義するとさらに親切だけど、今回は省略
        // outputSchema: {
        //   type: 'object',
        //   properties: {
        //     content: {
        //       type: 'array',
        //       items: {
        //         type: 'object',
        //         properties: {
        //           type: { type: 'string', enum: ['text'] },
        //           text: { type: 'string', description: 'JSON string representation of the query result array.' }
        //         },
        //         required: ['type', 'text']
        //       }
        //     }
        //   },
        //   required: ['content']
        // }
      },
     ],
  };
}

/**
 * CallTool リクエストハンドラ
 */
// 引数の型を CallToolRequest['params'] に変更
export async function handleCallTool(params: CallToolRequest['params']): Promise<CallToolResult> {
  if (params.name === 'query') {
    const sql = params.arguments?.sql as string;
    // ... (SQLチェック、実行、エラーハンドリングは変更なし) ...
    if (!sql || typeof sql !== 'string') { throw new Error("Missing or invalid 'sql' argument for query tool."); }
    const lowerSql = sql.toLowerCase().trim();
    if (!lowerSql.startsWith('select') && !lowerSql.startsWith('show') && !lowerSql.startsWith('describe') && !lowerSql.startsWith('explain')) { throw new Error("Only read-only queries (SELECT, SHOW, DESCRIBE, EXPLAIN) are allowed."); }

    const connection = await pool().getConnection();
    try {
      // ... (トランザクション、クエリ実行、ロールバックは変更なし) ...
      await connection.beginTransaction();
      console.error(`Executing read-only query: ${sql}`);
      const [rows] = await connection.query(sql);
      await connection.rollback();
      return {
        content: [
          { type: 'text', text: JSON.stringify(rows, null, 2) },
        ],
      };
    } catch (error) {
      // ... (エラー時のロールバック、ログ出力、返却処理は変更なし) ...
      await connection.rollback();
      console.error(`Error executing query tool with SQL: ${sql}`, error);
      return {
          content: [
              { type: 'text', text: `Error executing query: ${error instanceof Error ? error.message : String(error)}` }
          ],
      };
    } finally {
      connection.release();
    }
  }
  throw new Error(`Unknown tool requested: ${params.name}`);
}
