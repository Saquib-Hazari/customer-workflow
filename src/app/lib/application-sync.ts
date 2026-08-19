import { prisma } from "@/app/lib/prisma";

type SyncResult = {
  syncStatus: "SYNCED" | "FAILED";
  syncAttempts: number;
  lastSyncError: string | null;
};

/**
 * Simulates an external system call. Set MOCK_SYNC_FAILURE=true to exercise
 * the failure and retry path locally.
 */
export async function sendToMockExternalSystem(applicationId: string) {
  if (process.env.MOCK_SYNC_FAILURE === "true") {
    throw new Error("Mock external system is unavailable");
  }

  return { accepted: true, externalReference: `MOCK-${applicationId}` };
}

export async function syncApplication(
  applicationId: string,
  performedById: string,
): Promise<SyncResult> {
  const application = await prisma.application.update({
    where: { id: applicationId },
    data: {
      syncStatus: "PENDING",
      syncAttempts: { increment: 1 },
      lastSyncError: null,
    },
    select: { syncAttempts: true },
  });

  try {
    await sendToMockExternalSystem(applicationId);

    await prisma.application.update({
      where: { id: applicationId },
      data: { syncStatus: "SYNCED", lastSyncError: null },
    });
    await prisma.activity.create({
      data: {
        type: "APPLICATION_SYNC_SUCCEEDED",
        description: `Application synchronized successfully (attempt ${application.syncAttempts})`,
        applicationId,
        performedById,
      },
    });

    return {
      syncStatus: "SYNCED",
      syncAttempts: application.syncAttempts,
      lastSyncError: null,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "External synchronization failed";

    await prisma.application.update({
      where: { id: applicationId },
      data: { syncStatus: "FAILED", lastSyncError: message },
    });
    await prisma.activity.create({
      data: {
        type: "APPLICATION_SYNC_FAILED",
        description: `Application synchronization failed (attempt ${application.syncAttempts}): ${message}`,
        applicationId,
        performedById,
      },
    });

    return {
      syncStatus: "FAILED",
      syncAttempts: application.syncAttempts,
      lastSyncError: message,
    };
  }
}
