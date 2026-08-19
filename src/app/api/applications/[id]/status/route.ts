import { type NextRequest, NextResponse } from "next/server";
import { syncApplication } from "@/app/lib/application-sync";
import { prisma } from "@/app/lib/prisma";
import { canTransition } from "@/app/lib/workflow";
import { canManageApplicationForUser, currentActor } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const body = await request.json();

    const { nextStatus } = body;
    const validStatuses = [
      "NEW",
      "WAITING_FOR_INFORMATION",
      "IN_PROGRESS",
      "UNDER_REVIEW",
      "COMPLETED",
    ];

    if (!nextStatus) {
      return NextResponse.json(
        { error: "nextStatus is required" },
        { status: 400 },
      );
    }
    if (!validStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 },
      );
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: { assignedTo: { select: { teamId: true } } },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (
      !canManageApplicationForUser(actor, {
        assignedToId: application.assignedToId,
        createdById: application.createdById,
        teamId: application.assignedTo?.teamId,
      })
    )
      return NextResponse.json(
        { error: "You are not authorized to change this application" },
        { status: 403 },
      );

    if (
      !canTransition(
        application.status as keyof typeof import("@/app/lib/workflow").allowedTransitions,
        nextStatus,
      )
    ) {
      return NextResponse.json(
        {
          error: `Cannot move application from ${application.status} to ${nextStatus}`,
        },
        { status: 400 },
      );
    }

    await prisma.application.update({
      where: { id },
      data: {
        status: nextStatus,
        completedAt: nextStatus === "COMPLETED" ? new Date() : null,
        syncStatus:
          nextStatus === "COMPLETED" ? "PENDING" : application.syncStatus,
        activities: {
          create: {
            type: "STATUS_CHANGED",
            description: `Status changed from ${application.status} to ${nextStatus}`,
            performedById: actor.id,
          },
        },
      },
      include: {
        customer: true,
        assignedTo: true,
        createdBy: true,
        workItems: {
          include: { assignedTo: true, createdBy: true },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (nextStatus === "COMPLETED") {
      await syncApplication(id, actor.id);
    }

    const updatedApplication = await prisma.application.findUniqueOrThrow({
      where: { id },
      include: {
        customer: true,
        assignedTo: true,
        createdBy: true,
        workItems: {
          include: { assignedTo: true, createdBy: true },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: { performedBy: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json(updatedApplication);
  } catch (error) {
    console.error("Failed to update application status", error);

    return NextResponse.json(
      { error: "Failed to update application status" },
      { status: 500 },
    );
  }
}
