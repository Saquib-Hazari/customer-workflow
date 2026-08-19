import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canManageWorkItemForUser, currentActor } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const workItem = await prisma.workItem.findUnique({
      where: { id },
      include: {
        application: { include: { assignedTo: { select: { teamId: true } } } },
        assignedTo: true,
        createdBy: true,
      },
    });

    if (!workItem) {
      return NextResponse.json(
        { error: "Work item not found" },
        { status: 404 },
      );
    }
    if (
      !canManageWorkItemForUser(actor, {
        ...workItem,
        teamId:
          workItem.assignedTo?.teamId ??
          workItem.application.assignedTo?.teamId,
      })
    )
      return NextResponse.json(
        { error: "You are not authorized to update this work item" },
        { status: 403 },
      );

    return NextResponse.json(workItem);
  } catch (error) {
    console.error("Failed to load work item", error);
    return NextResponse.json(
      { error: "Failed to load work item" },
      { status: 500 },
    );
  }
}

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
    const workItem = await prisma.workItem.findUnique({
      where: { id },
      include: {
        application: { include: { assignedTo: { select: { teamId: true } } } },
        assignedTo: { select: { teamId: true } },
      },
    });

    if (!workItem) {
      return NextResponse.json(
        { error: "Work item not found" },
        { status: 404 },
      );
    }
    if (
      !canManageWorkItemForUser(actor, {
        assignedToId: workItem.assignedToId,
        createdById: workItem.createdById,
        teamId:
          workItem.assignedTo?.teamId ??
          workItem.application.assignedTo?.teamId,
      })
    )
      return NextResponse.json(
        { error: "You are not authorized to update this work item" },
        { status: 403 },
      );

    const title =
      body.title === undefined ? undefined : String(body.title).trim();
    const description =
      body.description === undefined || body.description === null
        ? body.description
        : String(body.description).trim();
    const status = body.status as
      | "TODO"
      | "IN_PROGRESS"
      | "COMPLETED"
      | undefined;
    const assignedToId =
      body.assignedToId === undefined ? undefined : body.assignedToId || null;

    if (title !== undefined && !title) {
      return NextResponse.json(
        { error: "Work item title cannot be empty" },
        { status: 400 },
      );
    }

    if (
      status !== undefined &&
      !["TODO", "IN_PROGRESS", "COMPLETED"].includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid work item status" },
        { status: 400 },
      );
    }

    if (assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true },
      });
      if (!assignee)
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 400 },
        );
    }

    const statusChanged = status !== undefined && status !== workItem.status;
    const updatedWorkItem = await prisma.workItem.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined
          ? { description: description || null }
          : {}),
        ...(status !== undefined
          ? {
              status,
              completedAt: status === "COMPLETED" ? new Date() : null,
            }
          : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      include: {
        application: true,
        assignedTo: true,
        createdBy: true,
      },
    });

    if (statusChanged) {
      await prisma.activity.create({
        data: {
          type:
            status === "COMPLETED"
              ? "WORK_ITEM_COMPLETED"
              : "WORK_ITEM_STATUS_CHANGED",
          description: `Work item status changed from ${workItem.status} to ${status}`,
          applicationId: workItem.applicationId,
          performedById: actor.id,
        },
      });
    }

    return NextResponse.json(updatedWorkItem);
  } catch (error) {
    console.error("Failed to update work item", error);
    return NextResponse.json(
      { error: "Failed to update work item" },
      { status: 500 },
    );
  }
}
