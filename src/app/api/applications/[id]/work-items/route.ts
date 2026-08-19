import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canManageApplicationForUser, currentActor } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: applicationId } = await context.params;
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const assignedToId =
      typeof body.assignedToId === "string" && body.assignedToId
        ? body.assignedToId
        : null;

    if (!title) {
      return NextResponse.json(
        { error: "A work item title is required" },
        { status: 400 },
      );
    }

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        assignedTo: { select: { teamId: true } },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (!canManageApplicationForUser(actor, application))
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage work items for this application",
        },
        { status: 403 },
      );

    if (assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true, teamId: true },
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 400 },
        );
      }
      if (actor.role === "MANAGER" && assignee.teamId !== actor.teamId)
        return NextResponse.json(
          { error: "You can only assign users on your team" },
          { status: 403 },
        );
      if (!["ADMIN", "MANAGER", "EXECUTIVE"].includes(assignee.role))
        return NextResponse.json(
          { error: "Invalid assignment user" },
          { status: 400 },
        );
    }

    const workItem = await prisma.workItem.create({
      data: {
        title,
        description: description || null,
        applicationId,
        assignedToId: actor.role === "EXECUTIVE" ? actor.id : assignedToId,
        createdById: actor.id,
      },
      include: {
        assignedTo: true,
        createdBy: true,
      },
    });

    await prisma.activity.create({
      data: {
        type: "WORK_ITEM_CREATED",
        description: `Work item created: ${title}`,
        applicationId,
        performedById: actor.id,
      },
    });

    return NextResponse.json(workItem, { status: 201 });
  } catch (error) {
    console.error("Failed to create work item", error);
    return NextResponse.json(
      { error: "Failed to create work item" },
      { status: 500 },
    );
  }
}
