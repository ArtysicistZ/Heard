"use client";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  HeartIcon,
  Loader2Icon,
  MapPinIcon,
  MessageSquareIcon,
  SendIcon,
  ShareIcon,
  SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface SentAction {
  recipient_name: string | null;
  recipient_title: string | null;
  jurisdiction: string | null;
  status: string;
  sent_at: string;
}

interface CandidateResponse {
  id: string;
  candidate_name: string | null;
  candidate_title: string | null;
  institution_name: string | null;
  body: string;
  created_at: string;
}

interface GrievanceDetail {
  id: string;
  user_id: string;
  thread_id: string | null;
  issue_summary: string;
  issue_category: string | null;
  severity: string | null;
  display_lat: number | null;
  display_lng: number | null;
  city: string | null;
  state: string | null;
  status: string;
  follow_count: number;
  is_following: boolean;
  created_at: string;
  updated_at: string | null;
  sent_action_count: number;
  sent_actions: SentAction[];
  candidate_responses: CandidateResponse[];
}

interface SimilarItem {
  id: string;
  issue_summary: string;
  issue_category: string | null;
  follow_count: number;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-400",
  resolved: "bg-emerald-500/10 text-emerald-400",
};

export default function GrievanceDetailPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [grievance, setGrievance] = useState<GrievanceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<SimilarItem[]>([]);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    const qs = user?.id ? `?user_id=${user.id}` : "";
    fetch(`${getBackendBaseURL()}/api/civic/grievances/${params.id}${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => setGrievance(data))
      .catch(() => setError("Grievance not found or is private"))
      .finally(() => setLoading(false));

    // Fetch similar grievances
    fetch(`${getBackendBaseURL()}/api/civic/grievances/${params.id}/similar`)
      .then((r) => r.json())
      .then((data) => setSimilar(data.similar ?? []))
      .catch(() => { /* optional */ });
  }, [params.id, user?.id]);

  const handleFollow = useCallback(async () => {
    if (!user || !grievance) {
      toast.error("Please sign in to follow grievances");
      return;
    }
    try {
      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/grievances/${grievance.id}/follow?user_id=${user.id}`,
        { method: "POST" },
      );
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setGrievance((prev) =>
        prev
          ? {
              ...prev,
              follow_count: data.follow_count,
              is_following: data.following,
            }
          : null,
      );
    } catch {
      toast.error("Failed to update follow");
    }
  }, [user, grievance]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: grievance?.issue_summary ?? "Grievance",
          text: `Check out this civic grievance on Heard: "${grievance?.issue_summary ?? ""}"`,
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    }
  }, [grievance]);

  if (loading) {
    return (
      <div className="flex size-full items-center justify-center">
        <Loader2Icon className="size-6 animate-spin" />
      </div>
    );
  }

  if (error || !grievance) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground text-sm">{error}</p>
        <Link
          href="/workspace/community"
          className="text-sm text-blue-500 hover:underline"
        >
          Back to Community
        </Link>
      </div>
    );
  }

  return (
    <div className="flex size-full flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Link
          href="/workspace/community"
          className="text-muted-foreground mb-3 inline-flex items-center gap-1 text-sm hover:underline"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to Community
        </Link>
        <h1 className="text-lg font-bold leading-snug">
          {grievance.issue_summary}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {grievance.city && grievance.state && (
            <span className="text-muted-foreground inline-flex items-center gap-0.5 text-xs">
              <MapPinIcon className="size-3" />
              {grievance.city}, {grievance.state}
            </span>
          )}
          {grievance.issue_category && (
            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
              {grievance.issue_category}
            </span>
          )}
          {grievance.severity && (
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                SEVERITY_STYLES[grievance.severity] ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {grievance.severity.toUpperCase()}
            </span>
          )}
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium capitalize",
              STATUS_STYLES[grievance.status] ??
                "bg-muted text-muted-foreground",
            )}
          >
            {grievance.status.replace("_", " ")}
          </span>
          <span className="text-muted-foreground text-xs">
            {new Date(grievance.created_at).toLocaleDateString()}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className={cn(
              "gap-1.5 text-xs",
              grievance.is_following && "text-red-500",
            )}
            onClick={() => void handleFollow()}
          >
            <HeartIcon
              className={cn(
                "size-3.5",
                grievance.is_following && "fill-current",
              )}
            />
            {grievance.follow_count} supporter
            {grievance.follow_count !== 1 ? "s" : ""}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => void handleShare()}
          >
            <ShareIcon className="size-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4">
        {/* Sent Actions Timeline */}
        {grievance.sent_actions.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <SendIcon className="size-4" />
              Officials Contacted ({grievance.sent_action_count})
            </h2>
            <div className="flex flex-col gap-2">
              {grievance.sent_actions.map((action, i) => (
                <div
                  key={i}
                  className="border-border flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    <CheckCircleIcon className="size-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {action.recipient_name ?? "Official"}
                    </p>
                    {action.recipient_title && (
                      <p className="text-muted-foreground text-xs">
                        {action.recipient_title}
                        {action.jurisdiction
                          ? ` · ${action.jurisdiction}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {new Date(action.sent_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Candidate Responses */}
        {grievance.candidate_responses.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <MessageSquareIcon className="size-4" />
              Official Responses ({grievance.candidate_responses.length})
            </h2>
            <div className="flex flex-col gap-3">
              {grievance.candidate_responses.map((resp) => (
                <div
                  key={resp.id}
                  className="border-border rounded-lg border bg-blue-500/5 p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">
                        {resp.candidate_name ?? "Official"}
                      </p>
                      {resp.institution_name && (
                        <p className="text-muted-foreground text-xs">
                          {resp.institution_name}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {new Date(resp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{resp.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {grievance.sent_actions.length === 0 &&
          grievance.candidate_responses.length === 0 && (
            <div className="text-muted-foreground py-8 text-center text-sm">
              No actions have been taken on this grievance yet.
            </div>
          )}

        {/* Similar Grievances */}
        {similar.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <SparklesIcon className="size-4" />
              Similar Issues in Your Area ({similar.length})
            </h2>
            <div className="flex flex-col gap-2">
              {similar.map((s) => (
                <Link
                  key={s.id}
                  href={`/workspace/grievances/${s.id}`}
                  className="border-border hover:bg-muted/30 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {s.issue_summary}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2">
                      {s.issue_category && (
                        <span className="text-muted-foreground text-[10px]">
                          {s.issue_category}
                        </span>
                      )}
                      <span className="text-muted-foreground text-[10px]">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <HeartIcon className="text-muted-foreground size-3" />
                    <span className="text-muted-foreground text-xs">
                      {s.follow_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
