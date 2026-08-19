import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  ApplicationStatus,
  Priority,
  PrismaClient,
  Role,
} from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const team =
    (await prisma.team.findFirst({
      where: { name: "Operations Team" },
    })) ??
    (await prisma.team.create({
      data: { name: "Operations Team" },
    }));

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    create: {
      name: "System Administrator",
      email: "admin@example.com",
      role: Role.ADMIN,
    },
    update: {
      name: "System Administrator",
      role: Role.ADMIN,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    create: {
      name: "Operations Manager",
      email: "manager@example.com",
      role: Role.MANAGER,
      teamId: team.id,
    },
    update: {
      name: "Operations Manager",
      role: Role.MANAGER,
      teamId: team.id,
    },
  });

  const executive = await prisma.user.upsert({
    where: { email: "executive@example.com" },
    create: {
      name: "Case Executive",
      email: "executive@example.com",
      role: Role.EXECUTIVE,
      teamId: team.id,
    },
    update: {
      name: "Case Executive",
      role: Role.EXECUTIVE,
      teamId: team.id,
    },
  });

  const customer =
    (await prisma.customer.findFirst({
      where: { email: "aarav.sharma@example.com" },
    })) ??
    (await prisma.customer.create({
      data: {
        firstName: "Aarav",
        lastName: "Sharma",
        email: "aarav.sharma@example.com",
        phone: "+91 98765 43210",
      },
    }));

  await prisma.application.upsert({
    where: { referenceNumber: "APP-1001" },
    create: {
      referenceNumber: "APP-1001",
      title: "Skilled migration application",
      description: "Initial application review and document verification.",
      status: ApplicationStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      customerId: customer.id,
      assignedToId: executive.id,
      createdById: manager.id,
      activities: {
        create: {
          type: "APPLICATION_CREATED",
          description: "Application created",
          performedById: manager.id,
        },
      },
    },
    update: {
      title: "Skilled migration application",
      description: "Initial application review and document verification.",
      status: ApplicationStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      customerId: customer.id,
      assignedToId: executive.id,
      createdById: manager.id,
    },
  });

  console.log("Seed data created successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
