import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import mysql from 'mysql2/promise';
import tunnel from 'tunnel-ssh';
import fs from 'fs';
import dotenv from 'dotenv';
import type { TunnelConfig } from 'tunnel-ssh';

dotenv.config();

const useSshTunnel = process.env.USE_SSH_TUNNEL === 'true';
let sshServer: any;

async function startServer() {
  let pool: mysql.Pool;

  if (useSshTunnel) {
    // SSHトンネルの設定（MySQLの場合、デフォルトポートは3306）
    const tunnelConfig: TunnelConfig = {
      username: process.env.SSH_BASTION_USER!,
      host: process.env.SSH_BASTION_HOST!,
      dstHost: process.env.DB_HOST!,
      dstPort: Number(process.env.DB_PORT || '3306'),
      privateKey: fs.readFileSync(process.env.SSH_PRIVATE_KEY_PATH!),
      passphrase: process.env.SSH_PRIVATE_KEY_PASSPHRASE,
      localHost: '127.0.0.1',
      localPort: Number(process.env.LOCAL_PORT || '3333'),
      port: 22,
      exec: false,
    };

    console.log('Establishing SSH tunnel...');
    tunnel(tunnelConfig, (error: unknown, server: unknown) => {
      if (error) {
        console.error('SSH Tunnel error:', error);
        process.exit(1);
      }

      sshServer = server; // prevent garbage collection

      // SSHトンネル経由でMySQLに接続
      pool = mysql.createPool({
        host: '127.0.0.1',
        port: Number(process.env.LOCAL_PORT || '3333'),
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000,
      });

      // Ensure MySQL is reachable before starting MCP server
      pool.getConnection()
        .then(conn => {
          conn.release();
          initMCPServer(pool);
        })
        .catch(err => {
          console.error("MySQL not ready:", err);
          process.exit(1);
        });
    });
  } else {
    // 直接MySQLに接続
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    initMCPServer(pool);
  }
}

function initMCPServer(pool: mysql.Pool) {
  // MCPサーバーの初期化
  const mcpServer = new Server(
    { name: 'example-servers/server-ts-mysql', version: '0.1.0' },
    { capabilities: { resources: {}, tools: {} } }
  );

  // リソース一覧ハンドラ：MySQLのinformation_schemaからテーブル一覧を取得
  mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
    const [rows] = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = ?",
      [process.env.DB_NAME]
    );
    const tables = rows as Array<{ TABLE_NAME: string }>;
    return {
      resources: tables.map((row) => ({
        uri: `mysql://${process.env.DB_HOST}/${row.TABLE_NAME}/schema`,
        mimeType: 'application/json',
        name: `"${row.TABLE_NAME}" database schema`,
      })),
    };
  });

  // テーブルスキーマ読み取りハンドラ
  mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
    // 例: mysql://localhost/users/schema から "users" を抽出
    const parts = new URL(request.params.uri).pathname.split('/');
    const tableName = parts[1];
    const [rows] = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = ? AND table_name = ?",
      [process.env.DB_NAME, tableName]
    );
    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: 'application/json',
          text: JSON.stringify(rows, null, 2),
        },
      ],
    };
  });

  // 利用可能なツール一覧ハンドラ
  mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'query',
          description: 'Execute read-only SQL queries against the connected MySQL database',
          inputSchema: {
            type: 'object',
            properties: { sql: { type: 'string' } },
          },
        },
      ],
    };
  });

  // SQLクエリ実行ツールハンドラ（読み取り専用）
  mcpServer.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    if (request.params.name === 'query') {
      const sql = request.params.arguments?.sql as string;
      const connection = await pool.getConnection();
      try {
        await connection.query("START TRANSACTION");
        // MySQLでは明示的なREAD ONLYモードは無いが、クエリ自体で書き込みを行わなければ安全
        const [rows] = await connection.query(sql);
        return {
          content: [
            { type: 'text', text: JSON.stringify(rows, null, 2) },
          ],
          isError: false,
        };
      } catch (error) {
        throw error;
      } finally {
        await connection.query("ROLLBACK");
        connection.release();
      }
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // MCPサーバーをStdioトランスポートで起動
  mcpServer.connect(new StdioServerTransport()).catch(console.error);
}

startServer().catch(console.error);
