export const USER_ROLES = [
  "Controller",
  "Dispatcher",
  "Operation",
  "Executor",
  "Pickup",
  "Delivery",
  "Maintainer",
  "Super User",
] as const;

export type UserRole = (typeof USER_ROLES)[number];
