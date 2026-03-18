"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createErrorLog, updateErrorStatus, deleteErrorLog } from "../actions";
import { type ErrorStatus } from "@prisma/client";
import { toast } from "sonner";
import { Plus, Bug, CheckCircle2, Search, X, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

type ErrorItem = {
  id: string;
  title: string;
  stackTrace: string;
  context: string;
  source: string;
  status: ErrorStatus;
  aiAnalysis: string;
  suggestedFix: string;
  createdAt: string;
  createdBy: { name: string };
};

const STATUS_STYLES: Record<ErrorStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-red-500/20 text-red-400" },
  investigating: { label: "Investigating", className: "bg-amber-500/20 text-amber-400" },
  resolved: { label: "Resolved", className: "bg-green-500/20 text-green-400" },
  dismissed: { label: "Dismissed", className: "bg-gray-700 text-gray-400" },
};

export function ErrorList({
  projectId,
  errors,
}: {
  projectId: string;
  errors: ErrorItem[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [filter, setFilter] = useState<ErrorStatus | "all">("all");

  const [title, setTitle] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = filter === "all" ? errors : errors.filter((e) => e.status === filter);

  const counts = {
    all: errors.length,
    open: errors.filter((e) => e.status === "open").length,
    investigating: errors.filter((e) => e.status === "investigating").length,
    resolved: errors.filter((e) => e.status === "resolved").length,
  };

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createErrorLog(projectId, { title, stackTrace, context, source });
      setTitle("");
      setStackTrace("");
      setContext("");
      setSource("");
      setAdding(false);
      toast.success("Error logged");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to log error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAnalyze(errorId: string) {
    setAnalyzing(errorId);
    try {
      const res = await fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ errorId }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      toast.success("Analysis complete");
      router.refresh();
    } catch {
      toast.error("Failed to analyze error");
    } finally {
      setAnalyzing(null);
    }
  }

  async function handleStatusChange(id: string, status: ErrorStatus) {
    await updateErrorStatus(id, status);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this error log?")) return;
    await deleteErrorLog(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Errors</h1>
          <span className="text-sm text-gray-500">
            {counts.open} open, {counts.investigating} investigating
          </span>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Error
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-1">
        {(["all", "open", "investigating", "resolved", "dismissed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === f ? "bg-gray-800 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {f === "all" ? `All (${counts.all})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Create form */}
      {adding && (
        <div className="rounded-lg border border-gray-800 p-4 space-y-3">
          <Input
            placeholder="Error title (e.g. 401 Unauthorized on POST /api/accounts)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Textarea
            placeholder="Stack trace (paste the full error output)"
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            rows={6}
            className="font-mono text-xs"
          />
          <Textarea
            placeholder="Context (what were you doing when this happened?)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
          />
          <Input
            placeholder="Source (e.g. browser console, server logs, API response)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!title.trim() || saving}>
              {saving ? "Saving..." : "Log Error"}
            </Button>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Error list */}
      {filtered.length === 0 && !adding && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {errors.length === 0
            ? "No errors logged yet. Click \"Log Error\" to record an issue."
            : "No errors match this filter."}
        </div>
      )}

      {filtered.map((error) => {
        const expanded = expandedId === error.id;
        const style = STATUS_STYLES[error.status];

        return (
          <div key={error.id} className="rounded-lg border border-gray-800">
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30"
              onClick={() => setExpandedId(expanded ? null : error.id)}
            >
              <Bug className={`h-5 w-5 shrink-0 ${
                error.status === "resolved" ? "text-green-500" :
                error.status === "investigating" ? "text-amber-500" : "text-red-500"
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{error.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}>
                    {style.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  by {error.createdBy.name} &middot; {new Date(error.createdAt).toLocaleString()}
                  {error.source && <> &middot; {error.source}</>}
                </div>
              </div>
              {error.aiAnalysis && (
                <span title="AI analyzed"><Sparkles className="h-4 w-4 text-blue-400 shrink-0" /></span>
              )}
            </div>

            {expanded && (
              <div className="border-t border-gray-800 p-4 space-y-4">
                {error.stackTrace && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Stack Trace</h4>
                    <pre className="rounded bg-gray-950 p-3 text-xs text-gray-300 overflow-x-auto font-mono whitespace-pre-wrap">
                      {error.stackTrace}
                    </pre>
                  </div>
                )}
                {error.context && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Context</h4>
                    <p className="text-sm text-gray-300">{error.context}</p>
                  </div>
                )}

                {error.aiAnalysis ? (
                  <div>
                    <h4 className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> AI Analysis
                    </h4>
                    <div className="rounded border border-blue-900/30 bg-blue-950/10 p-4 text-sm prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-headings:my-2">
                      <ReactMarkdown>{error.aiAnalysis}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAnalyze(error.id)}
                    disabled={analyzing === error.id}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    {analyzing === error.id ? "Analyzing..." : "Analyze with AI"}
                  </Button>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
                  <span className="text-xs text-gray-500">Status:</span>
                  {(["open", "investigating", "resolved", "dismissed"] as ErrorStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(error.id, s)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        error.status === s
                          ? STATUS_STYLES[s].className + " ring-1 ring-white/20"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {s === "resolved" && <CheckCircle2 className="inline h-3 w-3 mr-1" />}
                      {STATUS_STYLES[s].label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-red-400"
                    onClick={() => handleDelete(error.id)}
                  >
                    <X className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
