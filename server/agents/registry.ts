import type { AgentHandler } from "./types.ts";

const agents = new Map<string, AgentHandler>();

export const AgentRegistry = {
  register(agent: AgentHandler): void {
    agents.set(agent.name, agent);
  },

  get(name: string): AgentHandler | undefined {
    return agents.get(name);
  },

  all(): AgentHandler[] {
    return [...agents.values()];
  },

  has(name: string): boolean {
    return agents.has(name);
  },
};
