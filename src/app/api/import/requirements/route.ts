import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateFile, parseDocument } from "@/modules/import/lib/parse-document";
import { analyseDocument } from "@/modules/import/lib/analyse-document";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const projectId = formData.get("projectId") as string | null;

  if (!file || !projectId) {
    return NextResponse.json(
      { error: "Missing file or projectId" },
      { status: 400 }
    );
  }

  // Validate file
  const validationError = validateFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  // Verify project access
  const project = await prisma.project.findUnique({
    where: { id: projectId, deletedAt: null },
    include: {
      org: {
        include: { memberships: { where: { userId: session.user.id } } },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const parsed = await parseDocument(file);
    const importedData = await analyseDocument(parsed);
    return NextResponse.json(importedData);
  } catch (error) {
    console.error("Import failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Could not read this document. Please check the file and try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
