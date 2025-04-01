// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ReadResourceRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
    handleCallTool,
    handleListResources,
    handleListTools,
    handleReadResource
} from './handlers.js'; // ハンドラ関数をインポート
import { mcpServerInfo } from '../config.js'; // サーバー情報をインポート (パス修正)

let mcpServer: Server | null = null; // MCPサーバーインスタンスを保持

/**
 * MCPサーバーを初期化し、リクエストハンドラを登録する関数
 * @returns 初期化されたMCPサーバーインスタンス
 */
export function initializeMcpServer(): Server {
    if (mcpServer) {
        console.warn('MCP Server already initialized.');
        return mcpServer;
    }

    console.log('Initializing MCP server...');
    // MCPサーバーの初期化 (configから情報を取得)
    mcpServer = new Server(
        { name: mcpServerInfo.name, version: mcpServerInfo.version },
        // capabilities はここでは空でOK。ハンドラで動的に返すため。
        { capabilities: { resources: {}, tools: {} } }
    );

    // 各リクエストスキーマに対応するハンドラを登録
    mcpServer.setRequestHandler(ListResourcesRequestSchema, handleListResources);
    // ReadResourceRequestSchema のハンドラには params が渡される
    mcpServer.setRequestHandler(ReadResourceRequestSchema, (request: ReadResourceRequest) => handleReadResource(request.params));
    mcpServer.setRequestHandler(ListToolsRequestSchema, handleListTools);
    // CallToolRequestSchema のハンドラには params が渡される
    mcpServer.setRequestHandler(CallToolRequestSchema, (request: CallToolRequest) => handleCallTool(request.params));

    console.log('MCP server initialized and handlers registered.');
    return mcpServer;
}

/**
 * MCPサーバーをStdioトランスポートで起動する関数
 */
export async function startMcpServer(): Promise<void> {
    if (!mcpServer) {
        throw new Error('MCP Server has not been initialized. Call initializeMcpServer first.');
    }
    console.log('Starting MCP server with Stdio transport...');
    try {
        // MCPサーバーをStdioトランスポートで接続 (起動)
        await mcpServer.connect(new StdioServerTransport());
        console.log('MCP server connected via Stdio.');
    } catch (error) {
        console.error('Failed to start MCP server:', error);
        throw error; // エラーを再スロー
    }
}

/**
 * 初期化済みのMCPサーバーインスタンスを取得する関数 (シャットダウン処理用)
 * @returns MCPサーバーインスタンス (未初期化の場合は null)
 */
export function getMcpServer(): Server | null {
    return mcpServer;
}

/**
 * MCPサーバーを閉じる関数 (シャットダウン処理用)
 * @returns サーバー切断後に解決されるPromise
 */
export async function closeMcpServer(): Promise<void> {
    if (mcpServer) {
        console.log('Closing MCP server...');
        try {
            await mcpServer.close();
            console.log('MCP server closed successfully.');
            mcpServer = null; // インスタンス参照をクリア
        } catch (error) {
            console.error('Error closing MCP server:', error);
            // throw error; // 必要に応じて再スロー
        }
    } else {
        console.log('MCP server was not active, skipping closure.');
    }
}
