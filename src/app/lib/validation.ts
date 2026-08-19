export const applicationStatuses = [
  "NEW",
  "WAITING_FOR_INFORMATION",
  "IN_PROGRESS",
  "UNDER_REVIEW",
  "COMPLETED",
] as const;
export const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const workItemStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;

export function isValidEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value.trim());
}

export function isApplicationStatus(
  value: string,
): value is (typeof applicationStatuses)[number] {
  return applicationStatuses.includes(
    value as (typeof applicationStatuses)[number],
  );
}

export function isPriority(
  value: string,
): value is (typeof priorities)[number] {
  return priorities.includes(value as (typeof priorities)[number]);
}

export function isWorkItemStatus(
  value: string,
): value is (typeof workItemStatuses)[number] {
  return workItemStatuses.includes(value as (typeof workItemStatuses)[number]);
}
