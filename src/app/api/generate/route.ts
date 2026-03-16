import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateOutput } from "@/lib/generation/generate";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId, outputType } = await req.json();

  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        include: {
          requirements: {
            include: { metrics: true },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const stream = await generateOutput(outputType, {
      name: project.name,
      description: project.description,
      meta: project.meta || null,
      objectives: project.objectives,
      userStories: project.userStories,
      nfrCategories: project.requirementCategories
        .filter((c) => c.type === "non_functional")
        .map((c) => ({
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
            priority: r.priority,
            metrics: r.metrics,
          })),
        })),
      constraints: project.requirementCategories
        .filter((c) => c.type !== "non_functional")
        .map((c) => ({
          type: c.type,
          name: c.name,
          requirements: c.requirements.map((r) => ({
            title: r.title,
            description: r.description,
          })),
        })),
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("Generation failed:", error);
    return new Response("Generation failed", { status: 500 });
  }
}
