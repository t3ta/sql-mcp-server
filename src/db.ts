// src/db.ts
import mysql from 'mysql2/promise';
import { dbPoolOptions } from './config.js'; // DB接続設定をインポート

let pool: mysql.Pool | null = null; // コネクションプールを保持 (初期値は null)

/**
 * MySQLコネクションプールを初期化し、接続を確認する関数
 * @returns 初期化されたコネクションプール
 * @throws 接続に失敗した場合にエラーを投げる
 */
export async function initializeDbPool(): Promise<mysql.Pool> {
  if (pool) {
    console.warn('Database pool already initialized.');
    return pool; // すでに初期化済みなら既存のプールを返す
  }

  console.log('Initializing database connection pool...');
  try {
    pool = mysql.createPool(dbPoolOptions);

    // 接続テスト
    const connection = await pool.getConnection();
    console.log('Database connection test successful. Releasing test connection.');
    connection.release();

    console.log('Database connection pool initialized successfully.');
    return pool;
  } catch (error) {
    console.error('Failed to initialize database connection pool:', error);
    pool = null; // 初期化失敗時は null に戻す
    // エラーを再スローして呼び出し元に通知
    throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * MySQLコネクションプールを閉じる関数
 * @returns プール切断後に解決されるPromise (成功時: void, 失敗時: Error)
 */
export async function closeDbPool(): Promise<void> {
  if (pool) {
    console.log('Closing database connection pool...');
    try {
      await pool.end();
      console.log('Database connection pool closed successfully.');
      pool = null; // プール参照をクリア
    } catch (error) {
      console.error('Error closing database connection pool:', error);
      // エラーが発生しても、とりあえず先に進む場合もあるため、ここではエラーを再スローしないことも検討
      // throw error; // 必要に応じて再スロー
    }
  } else {
    console.log('Database pool was not active, skipping closure.');
  }
}

/**
 * 初期化済みのMySQLコネクションプールを取得する関数
 * @returns コネクションプール (未初期化の場合は null)
 * @throws プールが初期化されていない場合にエラーを投げる
 */
export function getDbPool(): mysql.Pool {
    if (!pool) {
        // 通常、initializeDbPool が先に呼ばれるはずなので、ここに来る場合は予期せぬ状態
        throw new Error('Database pool has not been initialized. Call initializeDbPool first.');
    }
    return pool;
}
