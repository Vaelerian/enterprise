import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { ProjectTabs } from "@/components/layout/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: {
        include: {
          memberships: { where: { userId: session.user.id } },
          projects: {
            where: { deletedAt: null },
            orderBy: { updatedAt: "desc" },
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  return (
    <>
      <ProjectSidebar
        orgSlug={project.org.slug}
        orgName={project.org.name}
        projects={project.org.projects}
        currentProjectId={project.id}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
          <h2 className="text-lg font-semibold">{project.name}</h2>
        </div>
        <ProjectTabs projectId={project.id} />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  );
}
