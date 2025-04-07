// src/shutdown.ts
import { closeMcpServer } from './mcp/server.js'; // MCPサーバー終了関数
import { closeDbPool } from './db.js';         // DBプール終了関数
import { closeSshTunnel } from './ssh-tunnel.js'; // SSHトンネル終了関数
import { useSshTunnel } from './config.js';     // SSHトンネル使用フラグ

let isShuttingDown = false; // シャットダウン処理中フラグ

/**
 * 安全なシャットダウン処理を実行する関数
 * @param signal 受け取ったシグナル名 (例: 'SIGTERM')
 */
async function shutdown(signal: string) {
  if (isShuttingDown) {
    console.error('Shutdown already in progress...');
    return;
  }
  isShuttingDown = true;
  console.error(`\nReceived ${signal}. Starting graceful shutdown...`);

  try {
    // 1. MCPサーバーを閉じる (新規リクエスト受付停止)
    await closeMcpServer();

    // 2. MySQLコネクションプールを閉じる
    await closeDbPool();

    // 3. SSHトンネルを閉じる (アクティブな場合のみ)
    if (useSshTunnel) {
      await closeSshTunnel();
    }

    console.error('Graceful shutdown completed.');
    process.exit(0); // 正常終了
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1); // 異常終了
  }
}

/**
 * シャットダウンシグナルハンドラを設定する関数
 */
export function setupShutdownHandlers() {
  process.on('SIGTERM', () => shutdown('SIGTERM')); // kill コマンドなど
  process.on('SIGINT', () => shutdown('SIGINT'));   // Ctrl+C
  // 必要に応じて他のシグナルも追加 (e.g., SIGHUP)
  console.error('Shutdown signal handlers registered.');
}
