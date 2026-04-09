import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      memberships: { where: { userId: session.user.id } },
    },
  });

  if (!org || org.memberships.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!org.githubToken) {
    return NextResponse.json({ error: "No GitHub token configured" }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.github.com/user/orgs", {
      headers: {
        Authorization: `Bearer ${org.githubToken}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch GitHub organizations" },
        { status: 502 }
      );
    }

    const ghOrgs = await response.json();
    const orgs = ghOrgs.map((o: { login: string; avatar_url: string }) => ({
      login: o.login,
      avatarUrl: o.avatar_url,
    }));

    return NextResponse.json({ orgs });
  } catch {
    return NextResponse.json(
      { error: "Could not reach GitHub" },
      { status: 502 }
    );
  }
}
