// src/index.ts
import { useSshTunnel } from './config.js';
import { connectSshTunnel } from './ssh-tunnel.js';
import { initializeDbPool } from './db.js';
import { initializeMcpServer, startMcpServer } from './mcp/server.js';
import { setupShutdownHandlers } from './shutdown.js';

/**
 * アプリケーションのメインエントリーポイント
 */
async function main() {
  console.error('Starting MCP server application...');

  try {
    // --- 初期化シーケンス ---
    // 1. SSHトンネル接続 (必要な場合のみ)
    if (useSshTunnel) {
      await connectSshTunnel(); // 接続完了を待つ
    } else {
      console.error('Skipping SSH tunnel connection as USE_SSH_TUNNEL is not true.');
    }

    // 2. DBコネクションプール初期化 & 接続テスト
    await initializeDbPool(); // 初期化と接続テスト完了を待つ

    // 3. MCPサーバー初期化 (ハンドラ登録など)
    // initializeMcpServer は同期的にサーバーインスタンスを作成・設定する
    initializeMcpServer();

    // 4. シャットダウンハンドラ設定
    // シグナルを受け取る準備をする
    setupShutdownHandlers();

    // --- サーバー起動 ---
    // 5. MCPサーバーをStdioトランスポートで起動
    // startMcpServer は内部で mcpServer.connect を呼び出し、
    // プロセスが終了シグナルを受け取るまで非同期に待機する。
    console.error('MCP Server initialized. Starting connection listener...');
    await startMcpServer();

    // 通常、startMcpServer が完了するのはシャットダウン処理が開始された後か、
    // 接続が予期せず切断された場合。
    console.error('MCP server process finished.');

  } catch (error) {
    console.error('Application failed during startup or runtime:', error);
    // エラー発生時は可能な範囲でクリーンアップを試みるのが理想だが、
    // ここではシンプルにエラー終了する。
    // より堅牢にするなら、shutdown.ts の shutdown 関数を呼び出すなど。
    process.exit(1); // エラーコード 1 で終了
  }
}

// アプリケーション起動！🚀
main();
