export interface PushClientOptions {
  endpoint: string;
  getToken: () => string | Promise<string>;
}

export function createPushClient(opts: PushClientOptions) {
  return {
    async ingest(event: Record<string, unknown>) {
      const token = await opts.getToken();
      await fetch(opts.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(event),
      });
    },
  };
}
