import { type NextRequest, NextResponse } from "next/server";
import { syncApplication } from "@/app/lib/application-sync";
import { prisma } from "@/app/lib/prisma";
import { canManageApplicationForUser, currentActor } from "@/lib/authorization";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        status: true,
        syncStatus: true,
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

    if (application.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Only completed applications can be synchronized" },
        { status: 400 },
      );
    }
    if (!canManageApplicationForUser(actor, application))
      return NextResponse.json(
        { error: "You are not authorized to synchronize this application" },
        { status: 403 },
      );

    if (application.syncStatus === "PENDING") {
      return NextResponse.json(
        { error: "Synchronization is already in progress" },
        { status: 409 },
      );
    }

    const result = await syncApplication(id, actor.id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to retry application synchronization", error);
    return NextResponse.json(
      { error: "Failed to retry application synchronization" },
      { status: 500 },
    );
  }
}
