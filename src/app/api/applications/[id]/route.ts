import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { currentActor } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const { id } = await context.params;

    const application = await prisma.application.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        assignedTo: { include: { team: true } },
        createdBy: { include: { team: true } },
        workItems: {
          include: {
            assignedTo: true,
            createdBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        activities: {
          include: {
            performedBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    const allowed =
      actor.role === "ADMIN" ||
      (actor.role === "EXECUTIVE" && application.assignedToId === actor.id) ||
      (actor.role === "MANAGER" &&
        (application.assignedTo?.teamId === actor.teamId ||
          application.createdBy.teamId === actor.teamId));
    if (!allowed)
      return NextResponse.json(
        { error: "You are not authorized to view this application" },
        { status: 403 },
      );

    return NextResponse.json(application);
  } catch (error) {
    console.error("Failed to load application", error);

    return NextResponse.json(
      { error: "Failed to load application" },
      { status: 500 },
    );
  }
}
