export const EVENT_CATEGORIES = [
  "MEETINGS",
  "PRODUCT",
  "CLIENT",
  "SPRINT",
  "MARKETING",
  "PERSONAL",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  MEETINGS: "#3b82f6",
  PRODUCT: "#a855f7",
  CLIENT: "#22c55e",
  SPRINT: "#f97316",
  MARKETING: "#ec4899",
  PERSONAL: "#64748b",
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  MEETINGS: "Meetings",
  PRODUCT: "Product",
  CLIENT: "Client",
  SPRINT: "Sprint",
  MARKETING: "Marketing",
  PERSONAL: "Personal",
};
