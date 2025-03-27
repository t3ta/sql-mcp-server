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
// グローバル変数として定義
let sshServer: any;
let mcpServer: Server | undefined;
let pool: mysql.Pool;

// シャットダウン処理を実装
async function shutdown(signal: string) {
  console.error(`\nReceived ${signal}. Starting graceful shutdown...`); // Changed to console.error

  try {
    // 1. MCPサーバーを閉じる（新規リクエストの受付を停止）
    if (mcpServer) {
      console.error('Closing MCP server...'); // Changed to console.error
      await mcpServer.close();
    }

    // 2. MySQLコネクションプールを閉じる
    if (pool) {
      console.error('Closing MySQL connection pool...'); // Changed to console.error
      await pool.end();
    }

    // 3. SSHトンネルを閉じる（アクティブな場合）
    if (sshServer) {
      console.error('Closing SSH tunnel...'); // Changed to console.error
      await new Promise<void>((resolve, reject) => {
        sshServer.close((err: Error) => {
          if (err) {
            console.error('Error closing SSH tunnel:', err); // Changed to console.error
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    console.error('Graceful shutdown completed.'); // Changed to console.error
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error); // Changed to console.error
    process.exit(1);
  }
}

// シグナルハンドラを設定
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

async function startServer() {

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

    tunnel(tunnelConfig, (error: unknown, server: unknown) => {
      if (error) {
        console.error('SSH Tunnel error:', error); // Changed to console.error
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
          console.error("MySQL not ready via tunnel:", err); // Changed to console.error
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
     // Ensure MySQL is reachable before starting MCP server
     pool.getConnection()
     .then(conn => {
       conn.release();
       initMCPServer(pool);
     })
     .catch(err => {
       console.error("MySQL not ready directly:", err); // Changed to console.error
       process.exit(1);
     });
  }
}

function initMCPServer(mysqlPool: mysql.Pool) {
  // MCPサーバーの初期化
  mcpServer = new Server(
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
        // MySQLでは明示的なREAD ONLYモードは無いが、クエリ自体で書き込みを行わなければ安全
        // READ ONLYトランザクションを開始する方がより安全
        await connection.query("START TRANSACTION READ ONLY");
        const [rows] = await connection.query(sql);
        await connection.query("COMMIT"); // READ ONLYでもCOMMIT/ROLLBACKは必要
        return {
          content: [
            { type: 'text', text: JSON.stringify(rows, null, 2) },
          ],
          isError: false,
        };
      } catch (error) {
        await connection.query("ROLLBACK"); // エラー時はロールバック
        throw error; // エラーを上位に伝播
      } finally {
        connection.release();
      }
    }
    throw new Error(`Unknown tool: ${request.params.name}`);
  });

  // MCPサーバーをStdioトランスポートで起動し、成功したら通知メッセージを送信
  mcpServer.connect(new StdioServerTransport())
    .then(() => {
      // サーバー準備完了のJSON-RPC通知を標準出力へ
      const readyMessage = {
        jsonrpc: "2.0",
        method: "serverReady",
        params: { message: "SQL MCP Server is ready." }
      };
      process.stdout.write(JSON.stringify(readyMessage) + '\n');
      console.error("MCP Server is ready and listening on stdio."); // Changed to console.error
    })
    .catch(error => {
      console.error('Failed to connect MCP server:', error); // Changed to console.error
      process.exit(1); // 接続失敗時は終了
    });
}

startServer().catch(error => {
  console.error('Failed to start server:', error); // Changed to console.error
  process.exit(1); // 起動失敗時も終了
});
