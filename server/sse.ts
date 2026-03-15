import type { Response } from "express";

type SSEClient = {
  id: number;
  res: Response;
};

let nextId = 1;
const clients: SSEClient[] = [];

export function addClient(res: Response): number {
  const id = nextId++;
  clients.push({ id, res });

  res.on("close", () => {
    const idx = clients.findIndex((c) => c.id === id);
    if (idx !== -1) clients.splice(idx, 1);
  });

  return id;
}

export function broadcast(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.res.write(payload);
  }
}
