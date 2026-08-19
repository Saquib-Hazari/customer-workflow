export const allowedTransitions = {
  NEW: ["WAITING_FOR_INFORMATION", "IN_PROGRESS"],
  WAITING_FOR_INFORMATION: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_FOR_INFORMATION", "UNDER_REVIEW"],
  UNDER_REVIEW: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: [],
} as const;

export function canTransition(
  currentStatus: keyof typeof allowedTransitions,
  nextStatus: string,
) {
  return allowedTransitions[currentStatus].includes(nextStatus as never);
}
