import { prisma } from "@/lib/prisma";
import { type ChangeType } from "@prisma/client";

export type ChangeInfo = {
  revisionNumber: number;
  changeType: ChangeType;
  changeId: string;
};

export type ResolvedItem<T> = T & {
  changeInfo?: ChangeInfo;
};

export type ResolvedProjectState = {
  meta: ResolvedItem<{
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  }>;
  objectives: ResolvedItem<{ id: string; title: string; successCriteria: string }>[];
  userStories: ResolvedItem<{ id: string; role: string; capability: string; benefit: string; priority: string }>[];
  requirementCategories: ResolvedItem<{
    id: string;
    type: string;
    name: string;
    requirements: ResolvedItem<{
      id: string;
      title: string;
      description: string;
      priority: string;
      metrics: { id: string; metricName: string; targetValue: string; unit: string }[];
    }>[];
  }>[];
  processFlows: ResolvedItem<{ id: string; name: string; flowType: string; diagramData: unknown }>[];
};

export async function resolveProjectState(
  projectId: string,
  revisionNumber?: number | null,
  includeDraftId?: string | null,
  stripRemoved: boolean = false
): Promise<ResolvedProjectState> {
  // 1. Fetch baseline
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId, deletedAt: null },
    include: {
      meta: true,
      objectives: { orderBy: { sortOrder: "asc" } },
      userStories: { orderBy: { sortOrder: "asc" } },
      requirementCategories: {
        orderBy: { sortOrder: "asc" },
        include: {
          requirements: {
            orderBy: { sortOrder: "asc" },
            include: { metrics: true },
          },
        },
      },
      processFlows: { orderBy: { sortOrder: "asc" } },
    },
  });

  // Build mutable state from baseline
  const state: ResolvedProjectState = {
    meta: {
      visionStatement: project.meta?.visionStatement ?? "",
      businessContext: project.meta?.businessContext ?? "",
      targetUsers: project.meta?.targetUsers ?? "",
      technicalConstraints: project.meta?.technicalConstraints ?? "",
      timeline: project.meta?.timeline ?? "",
      stakeholders: project.meta?.stakeholders ?? "",
      glossary: project.meta?.glossary ?? "",
    },
    objectives: project.objectives.map((o) => ({
      id: o.id,
      title: o.title,
      successCriteria: o.successCriteria,
    })),
    userStories: project.userStories.map((s) => ({
      id: s.id,
      role: s.role,
      capability: s.capability,
      benefit: s.benefit,
      priority: s.priority,
    })),
    requirementCategories: project.requirementCategories.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      requirements: c.requirements.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        metrics: r.metrics.map((m) => ({
          id: m.id,
          metricName: m.metricName,
          targetValue: m.targetValue,
          unit: m.unit,
        })),
      })),
    })),
    processFlows: project.processFlows.map((f) => ({
      id: f.id,
      name: f.name,
      flowType: f.flowType,
      diagramData: f.diagramData,
    })),
  };

  if (!revisionNumber && !includeDraftId) return state;

  // 2. Fetch revisions to apply
  const whereConditions = [];
  if (revisionNumber) {
    whereConditions.push({
      status: "finalized" as const,
      revisionNumber: { lte: revisionNumber },
    });
  }
  if (includeDraftId) {
    whereConditions.push({ id: includeDraftId });
  }

  const revisions = await prisma.revision.findMany({
    where: {
      projectId,
      OR: whereConditions,
    },
    orderBy: { revisionNumber: "asc" },
    include: {
      changes: { orderBy: { sortOrder: "asc" } },
    },
  });

  // 3. Apply changes sequentially
  for (const revision of revisions) {
    for (const change of revision.changes) {
      const info: ChangeInfo = {
        revisionNumber: revision.revisionNumber,
        changeType: change.changeType,
        changeId: change.id,
      };
      const d = change.data as Record<string, unknown>;

      switch (change.targetType) {
        case "objective":
          applyChange(state.objectives, change, info, d);
          break;
        case "user_story":
          applyChange(state.userStories, change, info, d);
          break;
        case "requirement_category":
          applyChangeCat(state.requirementCategories, change, info, d);
          break;
        case "requirement":
          applyChangeReq(state.requirementCategories, change, info, d);
          break;
        case "nfr_metric":
          applyChangeMetric(state.requirementCategories, change, info, d);
          break;
        case "process_flow":
          applyChange(state.processFlows, change, info, d);
          break;
        case "project_meta":
          Object.assign(state.meta, d);
          state.meta.changeInfo = info;
          break;
      }
    }
  }

  // 4. Strip removed items when generating (not for editor UI)
  if (stripRemoved) {
    state.objectives = state.objectives.filter(
      (i) => i.changeInfo?.changeType !== "removed"
    );
    state.userStories = state.userStories.filter(
      (i) => i.changeInfo?.changeType !== "removed"
    );
    state.processFlows = state.processFlows.filter(
      (i) => i.changeInfo?.changeType !== "removed"
    );
    state.requirementCategories = state.requirementCategories
      .filter((c) => c.changeInfo?.changeType !== "removed")
      .map((c) => ({
        ...c,
        requirements: c.requirements.filter(
          (r) => r.changeInfo?.changeType !== "removed"
        ),
      }));
  }

  return state;
}

function applyChange<T extends { id: string; changeInfo?: ChangeInfo }>(
  items: T[],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  if (change.changeType === "added") {
    items.push({ ...data, changeInfo: info } as T);
  } else if (change.changeType === "modified" && change.targetId) {
    const idx = items.findIndex((i) => i.id === change.targetId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...data, changeInfo: info };
    }
  } else if (change.changeType === "removed" && change.targetId) {
    const idx = items.findIndex((i) => i.id === change.targetId);
    if (idx >= 0) {
      items[idx] = { ...items[idx], changeInfo: info };
    }
  }
}

function applyChangeCat(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  if (change.changeType === "added") {
    categories.push({
      ...data,
      requirements: [],
      changeInfo: info,
    } as unknown as ResolvedProjectState["requirementCategories"][0]);
  } else if (change.changeType === "modified" && change.targetId) {
    const idx = categories.findIndex((c) => c.id === change.targetId);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], ...data, changeInfo: info };
    }
  } else if (change.changeType === "removed" && change.targetId) {
    const idx = categories.findIndex((c) => c.id === change.targetId);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], changeInfo: info };
    }
  }
}

function applyChangeReq(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  const categoryId = data.categoryId as string;
  if (change.changeType === "added") {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) {
      cat.requirements.push({
        ...data,
        metrics: (data.metrics as []) ?? [],
        changeInfo: info,
      } as unknown as ResolvedProjectState["requirementCategories"][0]["requirements"][0]);
    }
  } else if (change.changeType === "modified" && change.targetId) {
    for (const cat of categories) {
      const idx = cat.requirements.findIndex((r) => r.id === change.targetId);
      if (idx >= 0) {
        cat.requirements[idx] = {
          ...cat.requirements[idx],
          ...data,
          changeInfo: info,
        };
        break;
      }
    }
  } else if (change.changeType === "removed" && change.targetId) {
    for (const cat of categories) {
      const idx = cat.requirements.findIndex((r) => r.id === change.targetId);
      if (idx >= 0) {
        cat.requirements[idx] = {
          ...cat.requirements[idx],
          changeInfo: info,
        };
        break;
      }
    }
  }
}

function applyChangeMetric(
  categories: ResolvedProjectState["requirementCategories"],
  change: { changeType: string; targetId: string | null },
  info: ChangeInfo,
  data: Record<string, unknown>
) {
  const requirementId = data.requirementId as string;
  for (const cat of categories) {
    const req = cat.requirements.find((r) => r.id === requirementId);
    if (!req) continue;
    if (change.changeType === "added") {
      req.metrics.push(
        data as ResolvedProjectState["requirementCategories"][0]["requirements"][0]["metrics"][0]
      );
    } else if (change.changeType === "modified" && change.targetId) {
      const idx = req.metrics.findIndex((m) => m.id === change.targetId);
      if (idx >= 0) req.metrics[idx] = { ...req.metrics[idx], ...data };
    } else if (change.changeType === "removed" && change.targetId) {
      req.metrics = req.metrics.filter((m) => m.id !== change.targetId);
    }
    break;
  }
}
