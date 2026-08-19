import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { currentActor } from "@/lib/authorization";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await currentActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (target.id === actor.id)
    return NextResponse.json(
      { error: "You cannot remove yourself" },
      { status: 400 },
    );
  if (
    actor.role !== "ADMIN" &&
    !(
      actor.role === "MANAGER" &&
      target.role === "EXECUTIVE" &&
      target.teamId === actor.teamId
    )
  )
    return NextResponse.json(
      { error: "You do not have permission to remove this user" },
      { status: 403 },
    );
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "User cannot be removed while records are assigned to them" },
      { status: 409 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await currentActor();
  if (!actor)
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target)
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (
    actor.role !== "ADMIN" &&
    !(
      actor.role === "MANAGER" &&
      target.role === "EXECUTIVE" &&
      target.teamId === actor.teamId
    )
  )
    return NextResponse.json(
      { error: "You do not have permission to update this user" },
      { status: 403 },
    );
  const body = await request.json();
  const role = body.role ?? target.role;
  if (actor.role === "MANAGER" && role !== "EXECUTIVE")
    return NextResponse.json(
      { error: "Managers can only manage executives" },
      { status: 403 },
    );
  if (!["ADMIN", "MANAGER", "EXECUTIVE"].includes(role))
    return NextResponse.json({ error: "Invalid user role" }, { status: 400 });
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: typeof body.name === "string" ? body.name.trim() : target.name,
      role,
    },
  });
  return NextResponse.json(updated);
}
