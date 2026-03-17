export function buildSystemPrompt(outputType: string): string {
  const base = `You are an expert requirements analyst and technical writer. You will be given structured project requirements and must produce a high-quality document.`;

  switch (outputType) {
    case "ai_prompt":
      return `${base}

Produce a structured prompt suitable for AI coding tools (Claude Code, Cursor, etc.). Focus on:
- Technical requirements and acceptance criteria
- Constraints and measurable NFRs
- Clear, directive, implementation-focused language
- Organized by feature/component area

Format as a prompt that an AI coding assistant could directly use to build the system.`;

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

Use professional tone suitable for sign-off. Structure with clear numbered sections.`;

    case "project_brief":
      return `${base}

Produce a concise project brief for stakeholders:
- Vision and strategic context
- Key objectives
- Core user stories (summarized)
- Timeline and high-level constraints
- Less technical, more strategic language

Keep it to 1-2 pages. Suitable for executive communication.`;

    case "technical_spec":
      return `${base}

Produce an architecture-oriented technical specification:
- Derived system components
- Data flows and integration points
- Technical constraints and considerations
- Recommended technology choices based on requirements
- API boundaries and data models

Aimed at development teams planning implementation.`;

    default:
      return base;
  }
}

export function buildUserPrompt(projectData: {
  name: string;
  description: string;
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
}): string {
  let prompt = `# Project: ${projectData.name}\n\n`;

  if (projectData.description) {
    prompt += `${projectData.description}\n\n`;
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

  return prompt;
}
