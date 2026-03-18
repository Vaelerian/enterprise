export function buildChangesOnlySystemPrompt(outputType: string): string {
  const base = `You are an expert requirements analyst and technical writer. You are generating output ONLY for new changes being added to an existing project. The project already exists and is in production. You will receive ONLY the items that are new or changed - do NOT describe the full system, only what needs to be added or modified.

IMPORTANT: The repository structure and README are included so you can reference actual files, components, and patterns in the existing codebase. Your output should describe how to ADD these new features to the existing system, referencing specific files and patterns where relevant.`;

  switch (outputType) {
    case "ai_prompt":
      return `${base}

Produce a focused implementation prompt for AI coding tools to ADD these specific features to the existing codebase:
- Reference existing files and patterns from the repository
- Describe what new files to create and what existing files to modify
- Include acceptance criteria for just the new features
- Keep it scoped - don't describe the existing system, just the additions

Format as a prompt that an AI coding assistant could directly use to implement ONLY these new features.`;

    case "requirements_doc":
      return `${base}

Produce a requirements addendum document covering ONLY the new/changed requirements:
- Summary of what is being added or changed
- New functional requirements
- Impact on existing requirements (if any)
- New non-functional requirements or changes to existing ones

Write as an addendum that supplements the existing requirements document.`;

    case "project_brief":
      return `${base}

Produce a change summary brief for stakeholders:
- What is being added or changed and why
- Impact on existing features
- Timeline implications
- Key decisions needed

Keep it focused on the delta, not the full project.`;

    case "technical_spec":
      return `${base}

Produce a technical specification for implementing ONLY these changes:
- New components or modules needed
- Modifications to existing components (reference actual files)
- Data model changes
- API changes or new endpoints
- Migration considerations

Reference the existing codebase structure and describe how these changes integrate.`;

    default:
      return base;
  }
}

export function buildSystemPrompt(outputType: string, hasDiff?: boolean): string {
  const base = `You are an expert requirements analyst and technical writer. You will be given structured project requirements and must produce a high-quality document.`;

  const diffInstruction = hasDiff
    ? `\n\nIMPORTANT: This document is being generated from a specific version that has changes compared to the previous version. A "Changes Since" section is included in the input. You MUST highlight what is new or changed in your output. Use markers like "[NEW]" or "[CHANGED]" next to items that were added or modified since the previous version so the reader can quickly identify what evolved.`
    : "";

  switch (outputType) {
    case "ai_prompt":
      return `${base}

Produce a structured prompt suitable for AI coding tools (Claude Code, Cursor, etc.). Focus on:
- Technical requirements and acceptance criteria
- Constraints and measurable NFRs
- Clear, directive, implementation-focused language
- Organized by feature/component area

Format as a prompt that an AI coding assistant could directly use to build the system.${diffInstruction}`;

    case "requirements_doc":
      return `${base}

Produce a formal requirements document with:
- Executive summary
- Project scope
- Stakeholder list
- Functional requirements (derived from user stories)
- Non-functional requirements with metrics
- Constraints, assumptions, and dependencies
- Glossary

Use professional tone suitable for sign-off. Structure with clear numbered sections.${diffInstruction}`;

    case "project_brief":
      return `${base}

Produce a concise project brief for stakeholders:
- Vision and strategic context
- Key objectives
- Core user stories (summarized)
- Timeline and high-level constraints
- Less technical, more strategic language

Keep it to 1-2 pages. Suitable for executive communication.${diffInstruction}`;

    case "technical_spec":
      return `${base}

Produce an architecture-oriented technical specification:
- Derived system components
- Data flows and integration points
- Technical constraints and considerations
- Recommended technology choices based on requirements
- API boundaries and data models

Aimed at development teams planning implementation.${diffInstruction}`;

    default:
      return base + diffInstruction;
  }
}

export function buildUserPrompt(projectData: {
  name: string;
  description: string;
  gitRepo?: string;
  repoContext?: string;
  diffContext?: string;
  changesOnly?: boolean;
  meta: {
    businessContext: string;
    visionStatement: string;
    targetUsers: string;
    technicalConstraints: string;
    timeline: string;
    stakeholders: string;
    glossary: string;
  } | null;
  brand?: {
    colors: string;
    tone: string;
    description: string;
  } | null;
  objectives: { title: string; successCriteria: string }[];
  userStories: {
    role: string;
    capability: string;
    benefit: string;
    priority: string;
  }[];
  nfrCategories: {
    name: string;
    requirements: {
      title: string;
      description: string;
      priority: string;
      metrics: { metricName: string; targetValue: string; unit: string }[];
    }[];
  }[];
  constraints: {
    type: string;
    name: string;
    requirements: { title: string; description: string }[];
  }[];
  processFlows?: {
    name: string;
    flowType: string;
    diagramData: {
      nodes: { id: string; type: string; data: { label: string } }[];
      edges: { source: string; target: string; label?: string }[];
    };
  }[];
}): string {
  let prompt = `# Project: ${projectData.name}\n\n`;

  if (projectData.description) {
    prompt += `${projectData.description}\n\n`;
  }

  if (projectData.gitRepo) {
    prompt += `## Source Repository\n${projectData.gitRepo}\n\n`;
  }

  // Changes-only mode: include repo context + diff only, skip full requirements
  if (projectData.changesOnly && projectData.diffContext) {
    if (projectData.repoContext) {
      prompt += projectData.repoContext;
    }
    prompt += projectData.diffContext;
    return prompt;
  }

  if (projectData.repoContext) {
    prompt += projectData.repoContext;
  }

  if (projectData.diffContext) {
    prompt += projectData.diffContext;
  }

  if (projectData.brand) {
    prompt += `## Organization Brand\n`;
    if (projectData.brand.description) {
      prompt += `${projectData.brand.description}\n`;
    }
    if (projectData.brand.tone) {
      prompt += `- Brand tone: ${projectData.brand.tone}\n`;
    }
    if (projectData.brand.colors) {
      prompt += `- Brand colors: ${projectData.brand.colors}\n`;
    }
    prompt += "\n";
  }

  const meta = projectData.meta;
  if (meta) {
    if (meta.visionStatement) {
      prompt += `## Vision\n${meta.visionStatement}\n\n`;
    }
    if (meta.businessContext) {
      prompt += `## Business Context\n${meta.businessContext}\n\n`;
    }
    if (meta.targetUsers) {
      prompt += `## Target Users\n${meta.targetUsers}\n\n`;
    }
    if (meta.stakeholders) {
      prompt += `## Stakeholders\n${meta.stakeholders}\n\n`;
    }
    if (meta.timeline) {
      prompt += `## Timeline\n${meta.timeline}\n\n`;
    }
    if (meta.technicalConstraints) {
      prompt += `## Technical Constraints\n${meta.technicalConstraints}\n\n`;
    }
  }

  if (projectData.objectives.length > 0) {
    prompt += `## Key Objectives\n`;
    projectData.objectives.forEach((obj, i) => {
      prompt += `${i + 1}. **${obj.title}**`;
      if (obj.successCriteria) prompt += ` - Success: ${obj.successCriteria}`;
      prompt += "\n";
    });
    prompt += "\n";
  }

  if (projectData.userStories.length > 0) {
    prompt += `## User Stories\n`;
    projectData.userStories.forEach((s, i) => {
      prompt += `${i + 1}. [${s.priority.toUpperCase()}] As a ${s.role}, I want ${s.capability}`;
      if (s.benefit) prompt += `, so that ${s.benefit}`;
      prompt += "\n";
    });
    prompt += "\n";
  }

  if (projectData.nfrCategories.length > 0) {
    prompt += `## Non-Functional Requirements\n`;
    projectData.nfrCategories.forEach((cat) => {
      prompt += `### ${cat.name}\n`;
      cat.requirements.forEach((req) => {
        prompt += `- **${req.title}**: ${req.description}\n`;
        req.metrics.forEach((m) => {
          prompt += `  - ${m.metricName}: ${m.targetValue} ${m.unit}\n`;
        });
      });
    });
    prompt += "\n";
  }

  if (projectData.constraints.length > 0) {
    projectData.constraints.forEach((group) => {
      prompt += `## ${group.name}\n`;
      group.requirements.forEach((req) => {
        prompt += `- **${req.title}**: ${req.description}\n`;
      });
      prompt += "\n";
    });
  }

  if (meta?.glossary) {
    prompt += `## Glossary\n${meta.glossary}\n\n`;
  }

  if (projectData.processFlows && projectData.processFlows.length > 0) {
    prompt += `\n## Business Process Flows\n\n`;
    projectData.processFlows.forEach((flow) => {
      prompt += `### ${flow.name} (${flow.flowType === "as_is" ? "Current State" : "Future State"})\n`;
      const nodeMap = new Map(flow.diagramData.nodes.map((n) => [n.id, n.data.label]));
      flow.diagramData.edges.forEach((edge) => {
        const from = nodeMap.get(edge.source) ?? edge.source;
        const to = nodeMap.get(edge.target) ?? edge.target;
        prompt += `- ${from} -> ${to}${edge.label ? ` [${edge.label}]` : ""}\n`;
      });
      prompt += "\n";
    });
  }

  return prompt;
}

export function buildFlowGenerationPrompt(projectData: {
  name: string;
  description: string;
  meta: {
    visionStatement: string;
    businessContext: string;
    targetUsers: string;
  };
  objectives: { title: string; successCriteria: string }[];
  userStories: { role: string; capability: string; benefit: string }[];
}) {
  let prompt = `Based on the following project context, generate a business process flowchart.\n\n`;
  prompt += `## Project: ${projectData.name}\n${projectData.description}\n\n`;
  if (projectData.meta.visionStatement)
    prompt += `## Vision\n${projectData.meta.visionStatement}\n\n`;
  if (projectData.meta.businessContext)
    prompt += `## Business Context\n${projectData.meta.businessContext}\n\n`;
  if (projectData.objectives.length > 0) {
    prompt += `## Objectives\n`;
    projectData.objectives.forEach((o) => {
      prompt += `- ${o.title}${o.successCriteria ? ` (Success: ${o.successCriteria})` : ""}\n`;
    });
    prompt += "\n";
  }
  if (projectData.userStories.length > 0) {
    prompt += `## User Stories\n`;
    projectData.userStories.forEach((s) => {
      prompt += `- As a ${s.role}, I want ${s.capability}, so that ${s.benefit}\n`;
    });
    prompt += "\n";
  }
  prompt += `Return a JSON object with "nodes" and "edges" arrays for a flowchart.\n`;
  prompt += `Each node: { "id": "string", "type": "process"|"decision"|"start_end"|"subprocess", "data": { "label": "string" } }\n`;
  prompt += `Each edge: { "id": "string", "source": "node_id", "target": "node_id", "label": "optional string for decision branches" }\n`;
  prompt += `Use "start_end" type for the Start and End nodes. Use "decision" for yes/no branches. Use "process" for action steps.\n`;
  prompt += `Do not include position data -- positions will be auto-calculated.\n`;
  prompt += `Return ONLY the JSON object, no markdown fences or other text.`;
  return prompt;
}
