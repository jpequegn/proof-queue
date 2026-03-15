import { getConfig } from "./config.ts";

function baseUrl(): string {
  return getConfig().serverUrl;
}

async function request(path: string, options?: RequestInit) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  listThreads(profile?: string) {
    const params = profile ? `?profile=${profile}` : "";
    return request(`/api/threads${params}`);
  },

  getThread(id: string) {
    return request(`/api/threads/${id}`);
  },

  createThread(title: string, tags?: string[], createdBy = "cli-user") {
    return request("/api/threads", {
      method: "POST",
      body: JSON.stringify({ title, tags, createdBy }),
    });
  },

  updateStatus(id: string, status: string) {
    return request(`/api/threads/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  invite(id: string, identity: string, reason: string) {
    return request(`/api/threads/${id}/invite`, {
      method: "POST",
      body: JSON.stringify({ identity, reason, invitedBy: "cli-user" }),
    });
  },
};
