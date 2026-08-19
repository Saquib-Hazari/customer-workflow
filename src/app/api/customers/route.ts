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
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      include: {
        applications: {
          select: {
            id: true,
            referenceNumber: true,
            title: true,
            status: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(customers);
  } catch (error) {
    console.error("Failed to load customers", error);

    return NextResponse.json(
      { error: "Failed to load customers" },
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
        { error: "Only administrators and managers can create customers" },
        { status: 403 },
      );
    const body = await request.json();
    const firstName =
      typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName =
      typeof body.lastName === "string" ? body.lastName.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "First name, last name, and email are required" },
        { status: 400 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.create({
      data: { firstName, lastName, email, phone: phone || null },
      include: { applications: true },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 },
    );
  }
}
