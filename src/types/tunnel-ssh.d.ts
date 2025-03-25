declare module 'tunnel-ssh' {
  import { Server } from 'net';

  export interface TunnelConfig {
    username: string;
    host: string;
    port?: number;
    privateKey?: string | Buffer;
    dstHost: string;
    dstPort: number;
    localHost?: string;
    localPort?: number;
    keepAlive?: boolean;
    readyTimeout?: number;
    passphrase?: string;
    password?: string;
    exec?: boolean;
  }

  export default function tunnel(config: TunnelConfig, callback: (error: Error | null, server: Server) => void): Server;
}
