export interface ProfileContext {
  name: string;
  focus: string;
}

export const PROFILES: Record<string, ProfileContext> = {
  sre: { name: "SRE", focus: "production incidents, reliability, on-call urgency" },
  quant: { name: "Quant", focus: "data integrity, model correctness, market impact" },
  developer: { name: "Developer", focus: "code bugs, unblocking tasks, technical debt" },
  pm: { name: "PM", focus: "user impact, delivery, stakeholder communication" },
  user: { name: "User", focus: "feature requests, UX issues, account problems" },
};

export type ProfileName = keyof typeof PROFILES;
