import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { currentActor } from "@/lib/authorization";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const validStatuses = [
      "NEW",
      "WAITING_FOR_INFORMATION",
      "IN_PROGRESS",
      "UNDER_REVIEW",
      "COMPLETED",
    ];
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (status && !validStatuses.includes(status))
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (priority && !validPriorities.includes(priority))
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });

    const applications = await prisma.application.findMany({
      where: {
        AND: [
          actor.role === "EXECUTIVE" ? { assignedToId: actor.id } : {},
          actor.role === "MANAGER"
            ? {
                OR: [
                  { assignedTo: { teamId: actor.teamId } },
                  { createdBy: { teamId: actor.teamId } },
                ],
              }
            : {},
          status
            ? {
                status: status as
                  | "NEW"
                  | "WAITING_FOR_INFORMATION"
                  | "IN_PROGRESS"
                  | "UNDER_REVIEW"
                  | "COMPLETED",
              }
            : {},
          priority
            ? { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }
            : {},
          search
            ? {
                OR: [
                  { referenceNumber: { contains: search } },
                  { title: { contains: search } },
                  {
                    customer: {
                      OR: [
                        { firstName: { contains: search } },
                        { lastName: { contains: search } },
                      ],
                    },
                  },
                ],
              }
            : {},
        ],
      },
      include: { customer: true, assignedTo: true, createdBy: true },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(applications);
  } catch (error) {
    console.error("Failed to load applications", error);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    if (actor.role === "EXECUTIVE")
      return NextResponse.json(
        { error: "Executives cannot create applications" },
        { status: 403 },
      );
    const body = await request.json();
    const {
      referenceNumber,
      title,
      description,
      priority,
      customerId,
      assignedToId,
      // Ignore any client-supplied actor/creator ID; the cookie is authoritative.
    } = body;

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (
      typeof referenceNumber !== "string" ||
      typeof title !== "string" ||
      typeof description !== "string" ||
      !customerId
    ) {
      return NextResponse.json(
        { error: "Required fields are missing" },
        { status: 400 },
      );
    }
    if (priority && !validPriorities.includes(priority))
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 });

    const [customer, assignee] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: customerId },
        select: { id: true },
      }),
      assignedToId
        ? prisma.user.findUnique({
            where: { id: assignedToId },
            select: { id: true, role: true, teamId: true },
          })
        : null,
    ]);
    if (!customer)
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 400 },
      );
    if (assignedToId && !assignee)
      return NextResponse.json(
        { error: "Assigned user not found" },
        { status: 400 },
      );
    if (
      assignedToId &&
      assignee &&
      !["ADMIN", "MANAGER", "EXECUTIVE"].includes(assignee.role)
    )
      return NextResponse.json(
        { error: "Invalid assignment user" },
        { status: 400 },
      );
    if (
      assignedToId &&
      assignee &&
      actor.role === "MANAGER" &&
      assignee.teamId !== actor.teamId
    )
      return NextResponse.json(
        { error: "You can only assign users on your team" },
        { status: 403 },
      );

    const application = await prisma.application.create({
      data: {
        referenceNumber,
        title,
        description,
        priority: priority ?? "MEDIUM",
        customerId,
        assignedToId: assignedToId || null,
        createdById: actor.id,
        activities: {
          create: {
            type: "APPLICATION_CREATED",
            description: "Application created",
            performedById: actor.id,
          },
        },
      },
      include: { customer: true, assignedTo: true, activities: true },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error: unknown) {
    console.error("Failed to create application", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Reference number already exists" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 },
    );
  }
}
