// src/config.ts
import dotenv from 'dotenv';
import fs from 'fs';
import type { TunnelConfig } from 'tunnel-ssh';
import type { PoolOptions } from 'mysql2/promise';

dotenv.config();

// --- 基本設定 ---
export const useSshTunnel: boolean = process.env.USE_SSH_TUNNEL === 'true';
export const dbName: string | undefined = process.env.DB_NAME;

if (!dbName) {
  console.error('Error: DB_NAME environment variable is not set.');
  process.exit(1);
}

// --- SSHトンネル設定 (必要な場合のみ) ---
let sshTunnelConfig: TunnelConfig | undefined;
if (useSshTunnel) {
  const sshPrivateKeyPath = process.env.SSH_PRIVATE_KEY_PATH;
  if (!sshPrivateKeyPath) {
    console.error('Error: SSH_PRIVATE_KEY_PATH environment variable is required when USE_SSH_TUNNEL is true.');
    process.exit(1);
  }
  if (!fs.existsSync(sshPrivateKeyPath)) {
    console.error(`Error: SSH private key file not found at ${sshPrivateKeyPath}`);
    process.exit(1);
  }

  sshTunnelConfig = {
    username: process.env.SSH_BASTION_USER!,
    host: process.env.SSH_BASTION_HOST!,
    dstHost: process.env.DB_HOST!, // トンネル先のDBホスト
    dstPort: Number(process.env.DB_PORT || '3306'),
    privateKey: fs.readFileSync(sshPrivateKeyPath),
    passphrase: process.env.SSH_PRIVATE_KEY_PASSPHRASE,
    localHost: '127.0.0.1', // トンネルのローカル側ホスト
    localPort: Number(process.env.LOCAL_PORT || '3333'), // トンネルのローカル側ポート
    port: 22, // SSHポート
    exec: false,
  };
}
export { sshTunnelConfig };

// --- DB接続設定 ---
const dbPoolOptionsBase: Partial<PoolOptions> = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 接続タイムアウトを追加
};

let dbPoolOptions: PoolOptions;
if (useSshTunnel && sshTunnelConfig) {
  // SSHトンネル経由の場合
  dbPoolOptions = {
    ...dbPoolOptionsBase,
    host: sshTunnelConfig.localHost, // トンネルのローカルホスト
    port: sshTunnelConfig.localPort, // トンネルのローカルポート
  };
} else {
  // 直接接続の場合
  dbPoolOptions = {
    ...dbPoolOptionsBase,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || '3306'),
  };
}
export { dbPoolOptions };

// --- MCPサーバー設定 ---
export const mcpServerInfo = {
  name: 'example-servers/server-ts-mysql',
  version: '0.1.0',
};

// --- 環境変数チェック ---
function checkEnvVar(name: string, required: boolean = true): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    console.error(`Error: Required environment variable ${name} is not set.`);
    process.exit(1);
  }
  return value;
}

// 必須チェック
checkEnvVar('DB_USER');
checkEnvVar('DB_PASS');
checkEnvVar('DB_HOST');
// DB_NAME は上でチェック済み

if (useSshTunnel) {
  checkEnvVar('SSH_BASTION_USER');
  checkEnvVar('SSH_BASTION_HOST');
  checkEnvVar('SSH_PRIVATE_KEY_PATH'); // 上でチェック済みだが念のため
}

console.error('Configuration loaded successfully.'); // 設定読み込み完了ログ
