import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

const TYPE_LABELS: Record<string, string> = {
  ai_prompt: "AI Coding Prompt",
  requirements_doc: "Requirements Document",
  project_brief: "Project Brief",
  technical_spec: "Technical Spec",
};

export default async function OutputsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const project = await prisma.project.findUnique({
    where: { id, deletedAt: null },
    include: {
      org: { include: { memberships: { where: { userId: session.user.id } } } },
      generatedOutputs: {
        include: { generatedBy: { select: { name: true } } },
        orderBy: { generatedAt: "desc" },
      },
    },
  });

  if (!project || project.org.memberships.length === 0) notFound();

  const grouped = project.generatedOutputs.reduce(
    (acc, output) => {
      const type = output.outputType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(output);
      return acc;
    },
    {} as Record<string, typeof project.generatedOutputs>
  );

  return (
    <div className="p-8">
      <h2 className="mb-6 text-xl font-semibold">Generated Outputs</h2>
      {project.generatedOutputs.length === 0 ? (
        <p className="text-sm text-gray-400">
          No outputs yet. Use the Generate tab to create one.
        </p>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([type, outputs]) => (
            <div key={type}>
              <h3 className="mb-3 text-sm font-medium text-gray-400">
                {TYPE_LABELS[type] || type}
              </h3>
              <div className="space-y-2">
                {outputs.map((output) => (
                  <details
                    key={output.id}
                    className="rounded-lg border border-gray-800"
                  >
                    <summary className="cursor-pointer px-4 py-3 text-sm hover:bg-gray-800/50">
                      <span className="font-medium">
                        {new Date(output.generatedAt).toLocaleString()}
                      </span>
                      <span className="ml-2 text-gray-500">
                        by {output.generatedBy.name}
                      </span>
                      {output.editedContent && (
                        <span className="ml-2 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-300">
                          edited
                        </span>
                      )}
                    </summary>
                    <div className="border-t border-gray-800 p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300">
                        {output.editedContent || output.content}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
