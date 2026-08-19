import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { canManageApplicationForUser, currentActor } from "@/lib/authorization";

type RouteContext = { params: Promise<{ id: string }> };

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
    const assignedToId = body.assignedToId || null;
    if (actor.role === "EXECUTIVE")
      return NextResponse.json(
        { error: "Executives cannot assign or reassign applications" },
        { status: 403 },
      );

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        assignedToId: true,
        createdById: true,
        assignedTo: { select: { teamId: true } },
      },
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
        { error: "You are not authorized to reassign this application" },
        { status: 403 },
      );

    if (assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, name: true, role: true, teamId: true },
      });
      if (!assignee)
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 400 },
        );
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

    const updated = await prisma.application.update({
      where: { id },
      data: {
        assignedToId,
        activities: {
          create: {
            type: application.assignedToId
              ? "APPLICATION_REASSIGNED"
              : "APPLICATION_ASSIGNED",
            description: assignedToId
              ? `Application assigned to user ${assignedToId}`
              : "Application unassigned",
            performedById: actor.id,
          },
        },
      },
      include: { assignedTo: true, createdBy: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update application assignment", error);
    return NextResponse.json(
      { error: "Failed to update application assignment" },
      { status: 500 },
    );
  }
}
