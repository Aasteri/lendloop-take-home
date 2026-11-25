export const CATEGORIES = [
  "power tools",
  "garden",
  "kitchen",
  "camping",
  "automotive",
  "home",
  "electronics",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CONDITIONS = [
  "new",
  "excellent",
  "good",
  "fair",
  "well used",
] as const;

export type Condition = (typeof CONDITIONS)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}
