"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChangeBadge } from "./change-badge";
import { addChange, deleteChange } from "@/actions/revisions";
import type { ResolvedProjectState, ChangeInfo } from "@/lib/revisions";
import type { ChangeType, TargetType } from "@prisma/client";

type RevisionChange = {
  id: string;
  changeType: ChangeType;
  targetType: string;
  targetId: string | null;
  data: Record<string, unknown>;
};

type RevisionTabsProps = {
  revisionId: string;
  projectId: string;
  revisionNumber: number;
  resolvedState: ResolvedProjectState;
  changes: RevisionChange[];
  isDraft: boolean;
};

export function RevisionTabs({
  revisionId,
  projectId: _projectId,
  revisionNumber,
  resolvedState,
  changes: _changes,
  isDraft,
}: RevisionTabsProps) {
  void _projectId;
  void _changes;
  return (
    <Tabs defaultValue="meta" className="w-full">
      <TabsList>
        <TabsTrigger value="meta">Meta</TabsTrigger>
        <TabsTrigger value="objectives">Objectives</TabsTrigger>
        <TabsTrigger value="stories">User Stories</TabsTrigger>
        <TabsTrigger value="nfrs">NFRs</TabsTrigger>
        <TabsTrigger value="constraints">Constraints</TabsTrigger>
        <TabsTrigger value="flows">Process Flows</TabsTrigger>
      </TabsList>

      <TabsContent value="meta" className="mt-4 max-w-2xl">
        <MetaTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          meta={resolvedState.meta}
          isDraft={isDraft}
        />
      </TabsContent>

      <TabsContent value="objectives" className="mt-4 max-w-2xl">
        <ObjectivesTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          objectives={resolvedState.objectives}
          isDraft={isDraft}
        />
      </TabsContent>

      <TabsContent value="stories" className="mt-4 max-w-2xl">
        <UserStoriesTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          stories={resolvedState.userStories}
          isDraft={isDraft}
        />
      </TabsContent>

      <TabsContent value="nfrs" className="mt-4 max-w-2xl">
        <CategoriesTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          categories={resolvedState.requirementCategories.filter(
            (c) => c.type === "non_functional"
          )}
          isDraft={isDraft}
          categoryType="non_functional"
          description="Non-functional requirements with measurable targets."
        />
      </TabsContent>

      <TabsContent value="constraints" className="mt-4 max-w-2xl">
        <CategoriesTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          categories={resolvedState.requirementCategories.filter(
            (c) =>
              c.type === "constraint" ||
              c.type === "assumption" ||
              c.type === "dependency"
          )}
          isDraft={isDraft}
          categoryType="constraint"
          description="Constraints, assumptions, and dependencies that affect the project."
        />
      </TabsContent>

      <TabsContent value="flows" className="mt-4 max-w-2xl">
        <ProcessFlowsTab
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          flows={resolvedState.processFlows}
          isDraft={isDraft}
        />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isCurrentRevision(info: ChangeInfo | undefined, revNum: number) {
  return info?.revisionNumber === revNum;
}

function itemClassName(info: ChangeInfo | undefined) {
  if (info?.changeType === "removed") return "opacity-50 line-through";
  return "";
}

// ---------------------------------------------------------------------------
// Meta Tab
// ---------------------------------------------------------------------------

const META_FIELDS: { key: string; label: string }[] = [
  { key: "visionStatement", label: "Vision Statement" },
  { key: "businessContext", label: "Business Context" },
  { key: "targetUsers", label: "Target Users" },
  { key: "technicalConstraints", label: "Technical Constraints" },
  { key: "timeline", label: "Timeline" },
  { key: "stakeholders", label: "Stakeholders" },
  { key: "glossary", label: "Glossary" },
];

function MetaTab({
  revisionId,
  revisionNumber,
  meta,
  isDraft,
}: {
  revisionId: string;
  revisionNumber: number;
  meta: ResolvedProjectState["meta"];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(false);

  const current = isCurrentRevision(meta.changeInfo, revisionNumber);

  async function handleSave(fieldKey: string) {
    setLoading(true);
    await addChange(revisionId, "modified", "project_meta" as TargetType, null, {
      [fieldKey]: editValue,
    });
    setEditingField(null);
    setLoading(false);
    router.refresh();
  }

  async function handleUndo() {
    if (!meta.changeInfo) return;
    setLoading(true);
    await deleteChange(meta.changeInfo.changeId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {current && meta.changeInfo && (
        <div className="flex items-center gap-2">
          <ChangeBadge
            changeType={meta.changeInfo.changeType}
            onUndo={isDraft ? handleUndo : undefined}
          />
        </div>
      )}
      {META_FIELDS.map((field) => {
        const value = meta[field.key as keyof typeof meta] as string;
        const isEditing = editingField === field.key;

        return (
          <div key={field.key} className="space-y-1">
            <label className="text-sm font-medium text-gray-300">
              {field.label}
            </label>
            {isEditing ? (
              <div className="space-y-2">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSave(field.key)}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Change"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={`rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm whitespace-pre-wrap min-h-8 ${
                  isDraft ? "cursor-pointer hover:border-gray-500" : ""
                }`}
                onClick={() => {
                  if (isDraft) {
                    setEditValue(value);
                    setEditingField(field.key);
                  }
                }}
              >
                {value || (
                  <span className="text-gray-500 italic">Not set</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Objectives Tab
// ---------------------------------------------------------------------------

function ObjectivesTab({
  revisionId,
  revisionNumber,
  objectives,
  isDraft,
}: {
  revisionId: string;
  revisionNumber: number;
  objectives: ResolvedProjectState["objectives"];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({ title: "", successCriteria: "" });
  const [loading, setLoading] = useState(false);

  async function handleModify(targetId: string) {
    setLoading(true);
    await addChange(revisionId, "modified", "objective" as TargetType, targetId, {
      id: targetId,
      title: formData.title,
      successCriteria: formData.successCriteria,
    });
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(targetId: string) {
    setLoading(true);
    await addChange(revisionId, "removed", "objective" as TargetType, targetId, {});
    setLoading(false);
    router.refresh();
  }

  async function handleAdd() {
    if (!formData.title.trim()) return;
    setLoading(true);
    const newId = crypto.randomUUID();
    await addChange(revisionId, "added", "objective" as TargetType, null, {
      id: newId,
      title: formData.title,
      successCriteria: formData.successCriteria,
    });
    setFormData({ title: "", successCriteria: "" });
    setAddingNew(false);
    setLoading(false);
    router.refresh();
  }

  async function handleUndo(changeId: string) {
    setLoading(true);
    await deleteChange(changeId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {objectives.map((obj) => {
        const current = isCurrentRevision(obj.changeInfo, revisionNumber);
        const isEditing = editingId === obj.id;

        return (
          <div
            key={obj.id}
            className={`rounded-md border border-gray-700 bg-gray-900 p-3 ${itemClassName(
              current ? obj.changeInfo : undefined
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{obj.title}</p>
                {obj.successCriteria && (
                  <p className="text-xs text-gray-400 mt-1">
                    {obj.successCriteria}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {current && obj.changeInfo && (
                  <ChangeBadge
                    changeType={obj.changeInfo.changeType}
                    onUndo={isDraft ? () => handleUndo(obj.changeInfo!.changeId) : undefined}
                  />
                )}
                {isDraft && !current && obj.changeInfo?.changeType !== "removed" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setFormData({
                          title: obj.title,
                          successCriteria: obj.successCriteria,
                        });
                        setEditingId(obj.id);
                      }}
                    >
                      Modify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400"
                      onClick={() => handleRemove(obj.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                <Input
                  placeholder="Title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, title: e.target.value }))
                  }
                />
                <Textarea
                  placeholder="Success criteria"
                  value={formData.successCriteria}
                  onChange={(e) =>
                    setFormData((d) => ({
                      ...d,
                      successCriteria: e.target.value,
                    }))
                  }
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleModify(obj.id)}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Change"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isDraft &&
        (addingNew ? (
          <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
            <Input
              placeholder="Objective title"
              value={formData.title}
              onChange={(e) =>
                setFormData((d) => ({ ...d, title: e.target.value }))
              }
            />
            <Textarea
              placeholder="Success criteria"
              value={formData.successCriteria}
              onChange={(e) =>
                setFormData((d) => ({
                  ...d,
                  successCriteria: e.target.value,
                }))
              }
              rows={2}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddingNew(false);
                  setFormData({ title: "", successCriteria: "" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setFormData({ title: "", successCriteria: "" });
              setAddingNew(true);
            }}
          >
            Add Objective
          </Button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Stories Tab
// ---------------------------------------------------------------------------

function UserStoriesTab({
  revisionId,
  revisionNumber,
  stories,
  isDraft,
}: {
  revisionId: string;
  revisionNumber: number;
  stories: ResolvedProjectState["userStories"];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    role: "",
    capability: "",
    benefit: "",
    priority: "should",
  });
  const [loading, setLoading] = useState(false);

  async function handleModify(targetId: string) {
    setLoading(true);
    await addChange(revisionId, "modified", "user_story" as TargetType, targetId, {
      id: targetId,
      ...formData,
    });
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(targetId: string) {
    setLoading(true);
    await addChange(revisionId, "removed", "user_story" as TargetType, targetId, {});
    setLoading(false);
    router.refresh();
  }

  async function handleAdd() {
    if (!formData.capability.trim()) return;
    setLoading(true);
    const newId = crypto.randomUUID();
    await addChange(revisionId, "added", "user_story" as TargetType, null, {
      id: newId,
      ...formData,
    });
    setFormData({ role: "", capability: "", benefit: "", priority: "should" });
    setAddingNew(false);
    setLoading(false);
    router.refresh();
  }

  async function handleUndo(changeId: string) {
    setLoading(true);
    await deleteChange(changeId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {stories.map((story) => {
        const current = isCurrentRevision(story.changeInfo, revisionNumber);
        const isEditing = editingId === story.id;

        return (
          <div
            key={story.id}
            className={`rounded-md border border-gray-700 bg-gray-900 p-3 ${itemClassName(
              current ? story.changeInfo : undefined
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  As a {story.role}, I want {story.capability}
                </p>
                {story.benefit && (
                  <p className="text-xs text-gray-400 mt-1">
                    So that {story.benefit}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {current && story.changeInfo && (
                  <ChangeBadge
                    changeType={story.changeInfo.changeType}
                    onUndo={
                      isDraft
                        ? () => handleUndo(story.changeInfo!.changeId)
                        : undefined
                    }
                  />
                )}
                {isDraft && !current && story.changeInfo?.changeType !== "removed" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setFormData({
                          role: story.role,
                          capability: story.capability,
                          benefit: story.benefit,
                          priority: story.priority,
                        });
                        setEditingId(story.id);
                      }}
                    >
                      Modify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400"
                      onClick={() => handleRemove(story.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                <Input
                  placeholder="Role"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, role: e.target.value }))
                  }
                />
                <Input
                  placeholder="Capability"
                  value={formData.capability}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, capability: e.target.value }))
                  }
                />
                <Input
                  placeholder="Benefit"
                  value={formData.benefit}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, benefit: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleModify(story.id)}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Change"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isDraft &&
        (addingNew ? (
          <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
            <Input
              placeholder="Role (e.g. user)"
              value={formData.role}
              onChange={(e) =>
                setFormData((d) => ({ ...d, role: e.target.value }))
              }
            />
            <Input
              placeholder="Capability"
              value={formData.capability}
              onChange={(e) =>
                setFormData((d) => ({ ...d, capability: e.target.value }))
              }
            />
            <Input
              placeholder="Benefit"
              value={formData.benefit}
              onChange={(e) =>
                setFormData((d) => ({ ...d, benefit: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddingNew(false);
                  setFormData({
                    role: "",
                    capability: "",
                    benefit: "",
                    priority: "should",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setFormData({
                role: "",
                capability: "",
                benefit: "",
                priority: "should",
              });
              setAddingNew(true);
            }}
          >
            Add User Story
          </Button>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Categories Tab (NFRs + Constraints)
// ---------------------------------------------------------------------------

function CategoriesTab({
  revisionId,
  revisionNumber,
  categories,
  isDraft,
  categoryType,
  description,
}: {
  revisionId: string;
  revisionNumber: number;
  categories: ResolvedProjectState["requirementCategories"];
  isDraft: boolean;
  categoryType: string;
  description: string;
}) {
  const router = useRouter();
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    setLoading(true);
    const newId = crypto.randomUUID();
    await addChange(
      revisionId,
      "added",
      "requirement_category" as TargetType,
      null,
      { id: newId, name: newCatName, type: categoryType }
    );
    setNewCatName("");
    setAddingCategory(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">{description}</p>
      {categories.map((cat) => (
        <RevisionCategorySection
          key={cat.id}
          revisionId={revisionId}
          revisionNumber={revisionNumber}
          category={cat}
          isDraft={isDraft}
        />
      ))}
      {isDraft &&
        (addingCategory ? (
          <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
            <Input
              placeholder="Category name (e.g. Performance)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddCategory}
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Category"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingCategory(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setAddingCategory(true)}>
            Add Category
          </Button>
        ))}
    </div>
  );
}

function RevisionCategorySection({
  revisionId,
  revisionNumber,
  category,
  isDraft,
}: {
  revisionId: string;
  revisionNumber: number;
  category: ResolvedProjectState["requirementCategories"][0];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [addingReq, setAddingReq] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "should",
  });
  const [loading, setLoading] = useState(false);

  const catCurrent = isCurrentRevision(category.changeInfo, revisionNumber);

  async function handleRemoveCategory() {
    setLoading(true);
    await addChange(
      revisionId,
      "removed",
      "requirement_category" as TargetType,
      category.id,
      {}
    );
    setLoading(false);
    router.refresh();
  }

  async function handleUndoCategory() {
    if (!category.changeInfo) return;
    setLoading(true);
    await deleteChange(category.changeInfo.changeId);
    setLoading(false);
    router.refresh();
  }

  async function handleAddReq() {
    if (!formData.title.trim()) return;
    setLoading(true);
    const newId = crypto.randomUUID();
    await addChange(revisionId, "added", "requirement" as TargetType, null, {
      id: newId,
      categoryId: category.id,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      metrics: [],
    });
    setFormData({ title: "", description: "", priority: "should" });
    setAddingReq(false);
    setLoading(false);
    router.refresh();
  }

  async function handleModifyReq(targetId: string) {
    setLoading(true);
    await addChange(
      revisionId,
      "modified",
      "requirement" as TargetType,
      targetId,
      {
        id: targetId,
        categoryId: category.id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
      }
    );
    setEditingReqId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleRemoveReq(targetId: string) {
    setLoading(true);
    await addChange(
      revisionId,
      "removed",
      "requirement" as TargetType,
      targetId,
      {}
    );
    setLoading(false);
    router.refresh();
  }

  async function handleUndoReq(changeId: string) {
    setLoading(true);
    await deleteChange(changeId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div
      className={`rounded-lg border border-gray-800 overflow-hidden ${itemClassName(
        catCurrent ? category.changeInfo : undefined
      )}`}
    >
      <div className="flex items-center justify-between bg-gray-900 px-4 py-2">
        <button
          className="flex items-center gap-2 text-sm font-medium text-left flex-1"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="text-gray-500">{open ? "v" : ">"}</span>
          {category.name}
          <span className="ml-1 text-xs text-gray-500">
            ({category.requirements.length})
          </span>
        </button>
        <div className="flex items-center gap-2">
          {catCurrent && category.changeInfo && (
            <ChangeBadge
              changeType={category.changeInfo.changeType}
              onUndo={isDraft ? handleUndoCategory : undefined}
            />
          )}
          {isDraft && !catCurrent && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300 text-xs"
              onClick={handleRemoveCategory}
              disabled={loading}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="p-3 space-y-2">
          {category.requirements.map((req) => {
            const reqCurrent = isCurrentRevision(
              req.changeInfo,
              revisionNumber
            );
            const isEditing = editingReqId === req.id;

            return (
              <div
                key={req.id}
                className={`rounded-md border border-gray-700 bg-gray-800/50 p-3 ${itemClassName(
                  reqCurrent ? req.changeInfo : undefined
                )}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{req.title}</p>
                    {req.description && (
                      <p className="text-xs text-gray-400 mt-1">
                        {req.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Priority: {req.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {reqCurrent && req.changeInfo && (
                      <ChangeBadge
                        changeType={req.changeInfo.changeType}
                        onUndo={
                          isDraft
                            ? () => handleUndoReq(req.changeInfo!.changeId)
                            : undefined
                        }
                      />
                    )}
                    {isDraft &&
                      !reqCurrent &&
                      req.changeInfo?.changeType !== "removed" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setFormData({
                                title: req.title,
                                description: req.description,
                                priority: req.priority,
                              });
                              setEditingReqId(req.id);
                            }}
                          >
                            Modify
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-400"
                            onClick={() => handleRemoveReq(req.id)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        </>
                      )}
                  </div>
                </div>
                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                    <Input
                      placeholder="Title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData((d) => ({ ...d, title: e.target.value }))
                      }
                    />
                    <Textarea
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((d) => ({
                          ...d,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                    <select
                      className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData((d) => ({ ...d, priority: e.target.value }))
                      }
                    >
                      <option value="must">Must</option>
                      <option value="should">Should</option>
                      <option value="could">Could</option>
                      <option value="wont">Won&apos;t</option>
                    </select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleModifyReq(req.id)}
                        disabled={loading}
                      >
                        {loading ? "Saving..." : "Save Change"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingReqId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isDraft &&
            (addingReq ? (
              <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
                <Input
                  placeholder="Requirement title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, title: e.target.value }))
                  }
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, description: e.target.value }))
                  }
                  rows={2}
                />
                <select
                  className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, priority: e.target.value }))
                  }
                >
                  <option value="must">Must</option>
                  <option value="should">Should</option>
                  <option value="could">Could</option>
                  <option value="wont">Won&apos;t</option>
                </select>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddReq} disabled={loading}>
                    {loading ? "Adding..." : "Add"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAddingReq(false);
                      setFormData({
                        title: "",
                        description: "",
                        priority: "should",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400"
                onClick={() => {
                  setFormData({
                    title: "",
                    description: "",
                    priority: "should",
                  });
                  setAddingReq(true);
                }}
              >
                + Add requirement
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Process Flows Tab
// ---------------------------------------------------------------------------

function ProcessFlowsTab({
  revisionId,
  revisionNumber,
  flows,
  isDraft,
}: {
  revisionId: string;
  revisionNumber: number;
  flows: ResolvedProjectState["processFlows"];
  isDraft: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [formData, setFormData] = useState({ name: "", flowType: "process" });
  const [loading, setLoading] = useState(false);

  async function handleModify(targetId: string) {
    setLoading(true);
    await addChange(
      revisionId,
      "modified",
      "process_flow" as TargetType,
      targetId,
      { id: targetId, name: formData.name, flowType: formData.flowType }
    );
    setEditingId(null);
    setLoading(false);
    router.refresh();
  }

  async function handleRemove(targetId: string) {
    setLoading(true);
    await addChange(
      revisionId,
      "removed",
      "process_flow" as TargetType,
      targetId,
      {}
    );
    setLoading(false);
    router.refresh();
  }

  async function handleAdd() {
    if (!formData.name.trim()) return;
    setLoading(true);
    const newId = crypto.randomUUID();
    await addChange(
      revisionId,
      "added",
      "process_flow" as TargetType,
      null,
      { id: newId, name: formData.name, flowType: formData.flowType, diagramData: null }
    );
    setFormData({ name: "", flowType: "process" });
    setAddingNew(false);
    setLoading(false);
    router.refresh();
  }

  async function handleUndo(changeId: string) {
    setLoading(true);
    await deleteChange(changeId);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {flows.map((flow) => {
        const current = isCurrentRevision(flow.changeInfo, revisionNumber);
        const isEditing = editingId === flow.id;

        return (
          <div
            key={flow.id}
            className={`rounded-md border border-gray-700 bg-gray-900 p-3 ${itemClassName(
              current ? flow.changeInfo : undefined
            )}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{flow.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Type: {flow.flowType}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {current && flow.changeInfo && (
                  <ChangeBadge
                    changeType={flow.changeInfo.changeType}
                    onUndo={
                      isDraft
                        ? () => handleUndo(flow.changeInfo!.changeId)
                        : undefined
                    }
                  />
                )}
                {isDraft && !current && flow.changeInfo?.changeType !== "removed" && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setFormData({
                          name: flow.name,
                          flowType: flow.flowType,
                        });
                        setEditingId(flow.id);
                      }}
                    >
                      Modify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-400"
                      onClick={() => handleRemove(flow.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 space-y-2 border-t border-gray-700 pt-3">
                <Input
                  placeholder="Flow name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, name: e.target.value }))
                  }
                />
                <Input
                  placeholder="Flow type"
                  value={formData.flowType}
                  onChange={(e) =>
                    setFormData((d) => ({ ...d, flowType: e.target.value }))
                  }
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleModify(flow.id)}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save Change"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {isDraft &&
        (addingNew ? (
          <div className="rounded-md border border-gray-700 bg-gray-800/50 p-3 space-y-2">
            <Input
              placeholder="Flow name"
              value={formData.name}
              onChange={(e) =>
                setFormData((d) => ({ ...d, name: e.target.value }))
              }
            />
            <Input
              placeholder="Flow type (e.g. process)"
              value={formData.flowType}
              onChange={(e) =>
                setFormData((d) => ({ ...d, flowType: e.target.value }))
              }
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={loading}>
                {loading ? "Adding..." : "Add"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAddingNew(false);
                  setFormData({ name: "", flowType: "process" });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => {
              setFormData({ name: "", flowType: "process" });
              setAddingNew(true);
            }}
          >
            Add Process Flow
          </Button>
        ))}
    </div>
  );
}
