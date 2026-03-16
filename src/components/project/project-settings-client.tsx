"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { archiveProject, deleteProject } from "@/actions/projects";
import { OrgRole, ProjectStatus } from "@prisma/client";

export function ProjectSettingsClient({
  projectId,
  projectName,
  projectStatus,
  orgSlug,
  userRole,
  isCreator,
}: {
  projectId: string;
  projectName: string;
  projectStatus: ProjectStatus;
  orgSlug: string;
  userRole: OrgRole;
  isCreator: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const canArchive =
    isCreator || userRole === "owner" || userRole === "admin";
  const canDelete = userRole === "owner";

  async function handleArchive() {
    setLoading(true);
    await archiveProject(projectId);
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (
      !confirm(
        `Are you sure you want to delete "${projectName}"? This cannot be undone.`
      )
    )
      return;
    setLoading(true);
    await deleteProject(projectId);
    router.push(`/org/${orgSlug}/projects`);
  }

  return (
    <div className="max-w-md space-y-8">
      {canArchive && (
        <div className="rounded-lg border border-gray-800 p-4">
          <h3 className="text-sm font-medium">Archive Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            {projectStatus === "archived"
              ? "This project is archived. Unarchive to make it visible again."
              : "Archived projects are hidden from the default list."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleArchive}
            disabled={loading}
          >
            {projectStatus === "archived" ? "Unarchive" : "Archive"}
          </Button>
        </div>
      )}
      {canDelete && (
        <div className="rounded-lg border border-red-900/50 p-4">
          <h3 className="text-sm font-medium text-red-400">Delete Project</h3>
          <p className="mt-1 text-xs text-gray-400">
            Permanently removes this project from all views.
          </p>
          <Button
            variant="destructive"
            size="sm"
            className="mt-3"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete Project
          </Button>
        </div>
      )}
    </div>
  );
}
