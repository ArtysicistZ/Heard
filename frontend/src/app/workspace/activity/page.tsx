"use client";

import {
  CheckCircleIcon,
  GlobeIcon,
  LockIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  MegaphoneIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface MyGrievance {
  id: string;
  issue_summary: string;
  issue_category: string | null;
  severity: string | null;
  city: string | null;
  state: string | null;
  is_public: boolean;
  status: string;
  follow_count: number;
  created_at: string;
  sent_action_count: number;
}

interface MySentAction {
  id: string;
  recipient_name: string | null;
  recipient_title: string | null;
  email_subject: string | null;
  status: string;
  sent_at: string;
  grievance_summary: string | null;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

type Tab = "grievances" | "actions";

export default function MyActivityPage() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<MyGrievance[]>([]);
  const [actions, setActions] = useState<MySentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("grievances");

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`${getBackendBaseURL()}/api/civic/my-activity?user_id=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setGrievances(data.grievances ?? []);
        setActions(data.sent_actions ?? []);
      })
      .catch(() => {
        // silent
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggleVisibility = useCallback(
    async (grievanceId: string, currentPublic: boolean) => {
      if (!user) return;
      const newPublic = !currentPublic;
      // Optimistic update
      setGrievances((prev) =>
        prev.map((g) =>
          g.id === grievanceId ? { ...g, is_public: newPublic } : g,
        ),
      );
      try {
        const resp = await fetch(
          `${getBackendBaseURL()}/api/civic/grievances/${grievanceId}/visibility`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id, is_public: newPublic }),
          },
        );
        if (!resp.ok) throw new Error("Failed");
        toast.success(
          newPublic
            ? "Grievance is now public"
            : "Grievance is now private",
        );
      } catch {
        // Revert on failure
        setGrievances((prev) =>
          prev.map((g) =>
            g.id === grievanceId ? { ...g, is_public: currentPublic } : g,
          ),
        );
        toast.error("Failed to update visibility");
      }
    },
    [user],
  );

  if (!user) {
    return (
      <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
        Please sign in to view your activity.
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">My Activity</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your grievances and actions sent to officials
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setTab("grievances")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "grievances"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MegaphoneIcon className="size-4" />
          My Grievances ({grievances.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("actions")}
          className={cn(
            "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors",
            tab === "actions"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <MailIcon className="size-4" />
          Sent Actions ({actions.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
        ) : tab === "grievances" ? (
          grievances.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              You haven&apos;t filed any grievances yet. Start a chat to voice
              your concern.
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {grievances.map((g) => (
                <div key={g.id} className="px-6 py-4">
                  <p className="text-sm font-medium leading-snug">
                    {g.issue_summary}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {g.city && g.state && (
                      <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
                        <MapPinIcon className="size-3" />
                        {g.city}, {g.state}
                      </span>
                    )}
                    {g.issue_category && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                        {g.issue_category}
                      </span>
                    )}
                    {g.severity && (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-medium",
                          SEVERITY_STYLES[g.severity] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {g.severity.toUpperCase()}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleVisibility(g.id, g.is_public)
                      }
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80",
                        g.is_public
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-muted text-muted-foreground",
                      )}
                      title={
                        g.is_public
                          ? "Click to make private"
                          : "Click to make public"
                      }
                    >
                      {g.is_public ? (
                        <GlobeIcon className="size-2.5" />
                      ) : (
                        <LockIcon className="size-2.5" />
                      )}
                      {g.is_public ? "Public" : "Private"}
                    </button>
                    {g.sent_action_count > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {g.sent_action_count} official
                        {g.sent_action_count !== 1 ? "s" : ""} contacted
                      </span>
                    )}
                    {g.follow_count > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {g.follow_count} follower
                        {g.follow_count !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : actions.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            You haven&apos;t sent any actions to officials yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {actions.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-6 py-4">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                  <CheckCircleIcon className="size-4 text-emerald-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {a.recipient_name ?? "Official"}
                      </p>
                      {a.recipient_title && (
                        <p className="text-muted-foreground text-xs">
                          {a.recipient_title}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {new Date(a.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  {a.email_subject && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      Subject: {a.email_subject}
                    </p>
                  )}
                  {a.grievance_summary && (
                    <p className="text-muted-foreground mt-0.5 text-xs italic">
                      Re: {a.grievance_summary.slice(0, 100)}
                      {a.grievance_summary.length > 100 ? "..." : ""}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
