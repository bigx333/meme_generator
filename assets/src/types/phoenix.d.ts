declare module 'phoenix' {
  export class Socket {
    constructor(endpoint: string, options?: Record<string, unknown>)
    connect(): void
    disconnect(code?: number, reason?: string, callback?: () => void): void
    channel(topic: string, params?: Record<string, unknown>): {
      join(): { receive(status: string, callback: (payload: unknown) => void): unknown }
      on(event: string, callback: (payload: any) => void): void
      leave(): void
    }
  }
}
