import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";

export const DEMO_USER_COOKIE = "demo_user_id";

export async function getCurrentUser() {
  const userId = (await cookies()).get(DEMO_USER_COOKIE)?.value;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    include: { team: true },
  });
}
