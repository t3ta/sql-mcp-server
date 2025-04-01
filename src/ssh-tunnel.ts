// src/ssh-tunnel.ts
import tunnel from 'tunnel-ssh';
import { sshTunnelConfig } from './config.js'; // 設定をインポート
import type { TunnelConfig } from 'tunnel-ssh';

let sshServerInstance: any = null; // SSHサーバーインスタンスを保持

/**
 * SSHトンネルを確立する関数
 * @returns トンネル確立後に解決されるPromise (成功時: void, 失敗時: Error)
 */
export function connectSshTunnel(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!sshTunnelConfig) {
      // sshTunnelConfig が未定義の場合はトンネル不要とみなし、即座に解決
      console.log('SSH tunnel configuration not found, skipping tunnel connection.');
      resolve();
      return;
    }

    console.log('Attempting to establish SSH tunnel...');
    tunnel(sshTunnelConfig as TunnelConfig, (error: unknown, server: unknown) => {
      if (error) {
        console.error('SSH Tunnel connection error:', error);
        reject(new Error(`SSH Tunnel connection failed: ${error instanceof Error ? error.message : String(error)}`));
      } else {
        sshServerInstance = server; // インスタンスを保持
        console.log('SSH Tunnel established successfully.');
        resolve();
      }
    });
  });
}

/**
 * SSHトンネルを切断する関数
 * @returns トンネル切断後に解決されるPromise (成功時: void, 失敗時: Error)
 */
export function closeSshTunnel(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sshServerInstance) {
      console.log('Closing SSH tunnel...');
      // tunnel-ssh の close はコールバック形式なので Promise でラップ
      sshServerInstance.close((err: Error | null) => {
        if (err) {
          console.error('Error closing SSH tunnel:', err);
          reject(err);
        } else {
          console.log('SSH tunnel closed successfully.');
          sshServerInstance = null; // インスタンス参照をクリア
          resolve();
        }
      });
    } else {
      // トンネルが確立されていない場合は何もしない
      console.log('SSH tunnel was not active, skipping closure.');
      resolve();
    }
  });
}

/**
 * SSHトンネルサーバーのインスタンスを取得する (シャットダウン処理用)
 * @returns SSHサーバーインスタンス or null
 */
export function getSshServerInstance(): any {
    return sshServerInstance;
}
