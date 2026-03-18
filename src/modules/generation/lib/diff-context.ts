/**
 * Formats a version diff into a prompt section so the AI can highlight changes.
 */

import { type SnapshotDiff, countChanges } from "@/modules/versions/diff";

export function formatDiffForPrompt(diff: SnapshotDiff, fromVersion: number, toVersion: number): string {
  const counts = countChanges(diff);
  const total = counts.added + counts.modified + counts.removed;
  if (total === 0) return "";

  let section = `## Changes Since V${fromVersion} (now V${toVersion})\n\n`;
  section += `Summary: ${counts.added} added, ${counts.modified} modified, ${counts.removed} removed\n\n`;

  // Meta changes
  const changedMeta = diff.meta.filter((m) => m.status !== "unchanged");
  if (changedMeta.length > 0) {
    section += "### Meta Changes\n";
    for (const m of changedMeta) {
      if (m.status === "added") section += `- ADDED ${m.label}: "${m.after}"\n`;
      else if (m.status === "modified") section += `- CHANGED ${m.label}: "${m.before}" -> "${m.after}"\n`;
      else if (m.status === "removed") section += `- REMOVED ${m.label}\n`;
    }
    section += "\n";
  }

  // Objectives
  const changedObj = diff.objectives.filter((d) => d.status !== "unchanged");
  if (changedObj.length > 0) {
    section += "### Objective Changes\n";
    for (const d of changedObj) {
      const item = d.after ?? d.before;
      if (!item) continue;
      if (d.status === "added") section += `- ADDED: "${item.title}"\n`;
      else if (d.status === "modified") section += `- CHANGED: "${d.before?.title}" -> "${d.after?.title}"\n`;
      else if (d.status === "removed") section += `- REMOVED: "${item.title}"\n`;
    }
    section += "\n";
  }

  // User stories
  const changedStories = diff.userStories.filter((d) => d.status !== "unchanged");
  if (changedStories.length > 0) {
    section += "### User Story Changes\n";
    for (const d of changedStories) {
      const item = d.after ?? d.before;
      if (!item) continue;
      const desc = `As a ${item.role}, I want ${item.capability}`;
      if (d.status === "added") section += `- ADDED: "${desc}"\n`;
      else if (d.status === "modified") {
        const old = d.before ? `As a ${d.before.role}, I want ${d.before.capability}` : "";
        section += `- CHANGED: "${old}" -> "${desc}"\n`;
      } else if (d.status === "removed") section += `- REMOVED: "${desc}"\n`;
    }
    section += "\n";
  }

  // Requirements
  const changedCats = diff.requirementCategories.filter((c) => c.status !== "unchanged");
  if (changedCats.length > 0) {
    section += "### Requirement Changes\n";
    for (const cat of changedCats) {
      const data = cat.after ?? cat.before;
      if (!data) continue;
      if (cat.status === "added") {
        section += `- ADDED category: "${data.name}"\n`;
      } else if (cat.status === "removed") {
        section += `- REMOVED category: "${data.name}"\n`;
      }
      const reqs = data.requirements ?? [];
      for (const r of reqs) {
        if (r.status === "unchanged") continue;
        const req = r.after ?? r.before;
        if (!req) continue;
        if (r.status === "added") section += `  - ADDED: "${req.title}"\n`;
        else if (r.status === "modified") section += `  - CHANGED: "${r.before?.title}" -> "${r.after?.title}"\n`;
        else if (r.status === "removed") section += `  - REMOVED: "${req.title}"\n`;
      }
    }
    section += "\n";
  }

  // Process flows
  const changedFlows = diff.processFlows.filter((d) => d.status !== "unchanged");
  if (changedFlows.length > 0) {
    section += "### Process Flow Changes\n";
    for (const d of changedFlows) {
      const item = d.after ?? d.before;
      if (!item) continue;
      if (d.status === "added") section += `- ADDED: "${item.name}"\n`;
      else if (d.status === "modified") section += `- CHANGED: "${d.before?.name}" -> "${d.after?.name}"\n`;
      else if (d.status === "removed") section += `- REMOVED: "${item.name}"\n`;
    }
    section += "\n";
  }

  return section;
}
