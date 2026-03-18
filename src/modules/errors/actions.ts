"use server";

import { prisma } from "@/lib/prisma";
import { requireSession, requireOrgMembership } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { type ErrorStatus } from "@prisma/client";

export async function createErrorLog(
  projectId: string,
  data: { title: string; stackTrace?: string; context?: string; source?: string }
) {
  const user = await requireSession();
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: { org: true },
  });
  await requireOrgMembership(user.id, project.orgId);

  const error = await prisma.errorLog.create({
    data: {
      projectId,
      title: data.title,
      stackTrace: data.stackTrace || "",
      context: data.context || "",
      source: data.source || "",
      createdById: user.id,
    },
  });

  revalidatePath(`/project/${projectId}/errors`);
  return error;
}

export async function updateErrorStatus(id: string, status: ErrorStatus) {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorLog.update({ where: { id }, data: { status } });
  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}

export async function deleteErrorLog(id: string) {
  const user = await requireSession();
  const error = await prisma.errorLog.findUniqueOrThrow({
    where: { id },
    include: { project: { include: { org: true } } },
  });
  await requireOrgMembership(user.id, error.project.orgId);

  await prisma.errorLog.delete({ where: { id } });
  revalidatePath(`/project/${error.projectId}/errors`);
  return { success: true };
}
