"use client";

import {
  BarChart3Icon,
  HeartIcon,
  Loader2Icon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface DashboardGrievance {
  id: string;
  issue_summary: string;
  issue_category: string | null;
  severity: string | null;
  city: string | null;
  state: string | null;
  status: string;
  follow_count: number;
  created_at: string;
  sent_action_count: number;
}

interface DirectedAction {
  id: string;
  grievance_id: string | null;
  sender_name: string | null;
  issue_summary: string | null;
  email_subject: string | null;
  recipient_name: string | null;
  status: string;
  sent_at: string;
}

interface DashboardData {
  candidate_name: string | null;
  institution_name: string | null;
  level: string | null;
  district: string | null;
  verified: boolean;
  stats: {
    total_grievances: number;
    total_directed_actions: number;
    total_followers: number;
    top_categories: { category: string; count: number }[];
  };
  district_grievances: DashboardGrievance[];
  directed_actions: DirectedAction[];
  trending_grievances: DashboardGrievance[];
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "text-red-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

interface PulseData {
  total_grievances: number;
  total_followers: number;
  resolution_rate: number;
  categories: { category: string; count: number }[];
  monthly_trend: { period: string; count: number }[];
  emerging_issues: {
    id: string;
    issue_summary: string;
    issue_category: string | null;
    follow_count: number;
    follow_velocity: number;
    created_at: string;
  }[];
}

type Tab = "district" | "directed" | "trending" | "pulse";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("district");
  const [respondingTo, setRespondingTo] = useState<DashboardGrievance | null>(null);
  const [responseBody, setResponseBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pulse, setPulse] = useState<PulseData | null>(null);
  const [pulseLoading, setPulseLoading] = useState(false);

  const fetchPulse = useCallback(async () => {
    if (!data?.level) return;
    setPulseLoading(true);
    try {
      // Map level to district_type + value using same logic as backend LEVEL_TO_MATCH
      const levelMap: Record<string, string> = {
        municipal: "council_district",
        municipal_at_large: "city",
        county: "county",
        state_house: "state_house_dist",
        state_senate: "state_senate_dist",
        statewide: "state",
        us_house: "congressional_dist",
        us_senate: "state",
      };
      const districtType = levelMap[data.level] ?? "council_district";
      // data.district now contains city name for municipal_at_large, state for statewide/us_senate
      const districtValue = data.district ?? "";
      if (!districtValue) {
        setPulseLoading(false);
        return;
      }

      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/analytics/district-pulse?district_type=${districtType}&district=${encodeURIComponent(districtValue)}`,
      );
      if (!resp.ok) return;
      setPulse(await resp.json());
    } catch {
      // optional
    } finally {
      setPulseLoading(false);
    }
  }, [data]);

  const handleSubmitResponse = useCallback(async () => {
    if (!user || !respondingTo || !responseBody.trim()) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`${getBackendBaseURL()}/api/civic/dashboard/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          grievance_id: respondingTo.id,
          body: responseBody.trim(),
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ detail: "Failed" }));
        throw new Error(err.detail ?? "Failed to submit response");
      }
      toast.success("Response published successfully");
      setRespondingTo(null);
      setResponseBody("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit response");
    } finally {
      setSubmitting(false);
    }
  }, [user, respondingTo, responseBody]);

  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/dashboard?user_id=${user.id}`,
      );
      if (resp.status === 403 || resp.status === 404) {
        setError("constituent");
        return;
      }
      if (!resp.ok) throw new Error("Failed to load dashboard");
      setData(await resp.json());
    } catch {
      setError("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/auth/login");
      return;
    }
    void fetchDashboard();
  }, [user, authLoading, router, fetchDashboard]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2Icon className="size-8 animate-spin" />
      </div>
    );
  }

  if (error === "constituent") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <ShieldXIcon className="text-muted-foreground size-12" />
        <h1 className="text-xl font-bold">Dashboard is for Elected Officials</h1>
        <p className="text-muted-foreground text-sm">
          This dashboard is only available to verified elected officials.
        </p>
        <Button onClick={() => router.push("/workspace")}>
          Go to Workspace
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load dashboard</p>
      </div>
    );
  }

  if (!data.verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <ShieldXIcon className="text-amber-400 size-12" />
        <h1 className="text-xl font-bold">Verification Pending</h1>
        <p className="text-muted-foreground text-center text-sm">
          Your account is pending verification. Once verified, you&apos;ll be
          able to see constituent grievances in your district.
        </p>
        <p className="text-muted-foreground text-xs">
          Institution: {data.institution_name ?? "Not selected"}
        </p>
      </div>
    );
  }

  const grievances =
    tab === "district"
      ? data.district_grievances
      : tab === "trending"
        ? data.trending_grievances
        : [];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-b px-6 py-5">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="size-6 text-emerald-500" />
          <div>
            <h1 className="text-xl font-bold">
              {data.candidate_name ?? "Dashboard"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {data.institution_name}
              {data.district
                ? data.level === "municipal_at_large" || data.level === "statewide" || data.level === "us_senate"
                  ? ` \u2014 ${data.district}`
                  : ` \u2014 District ${data.district}`
                : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <MegaphoneIcon className="size-5 text-blue-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {data.stats.total_grievances}
            </div>
            <div className="text-muted-foreground text-xs">
              {data.level === "municipal_at_large" ? "Grievances Citywide" : "Grievances in District"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <MailIcon className="size-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {data.stats.total_directed_actions}
            </div>
            <div className="text-muted-foreground text-xs">
              Actions Directed to You
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
            <HeartIcon className="size-5 text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {data.stats.total_followers}
            </div>
            <div className="text-muted-foreground text-xs">
              Total Follows
            </div>
          </div>
        </div>
      </div>

      {/* Top categories */}
      {data.stats.top_categories.length > 0 && (
        <div className="border-b px-6 py-3">
          <div className="flex items-center gap-2">
            <BarChart3Icon className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-xs font-medium">
              Top Issues:
            </span>
            {data.stats.top_categories.map((cat) => (
              <span
                key={cat.category}
                className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs"
              >
                {cat.category} ({cat.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b">
        {(
          [
            ["district", "In My District"],
            ["directed", "Directed to Me"],
            ["trending", "Trending"],
            ["pulse", "Pulse"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              if (key === "pulse" && !pulse) void fetchPulse();
            }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors",
              tab === key
                ? "border-b-2 border-blue-500 text-blue-500"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "pulse" ? (
          /* Pulse analytics tab */
          pulseLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="size-6 animate-spin" />
            </div>
          ) : !pulse ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              No analytics data available yet.
            </div>
          ) : (
            <div className="space-y-5 px-6 py-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="border-border rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{pulse.total_grievances}</div>
                  <div className="text-muted-foreground text-xs">Total Grievances</div>
                </div>
                <div className="border-border rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{pulse.total_followers}</div>
                  <div className="text-muted-foreground text-xs">Community Support</div>
                </div>
                <div className="border-border rounded-lg border p-3 text-center">
                  <div className="text-2xl font-bold">{pulse.resolution_rate}%</div>
                  <div className="text-muted-foreground text-xs">Resolution Rate</div>
                </div>
              </div>

              {/* Two-column: Category breakdown + Monthly trend */}
              <div className="grid grid-cols-2 gap-5">
                {/* Category breakdown */}
                {pulse.categories.length > 0 && (
                  <div className="border-border rounded-lg border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Top Issues</h3>
                    <div className="space-y-2">
                      {pulse.categories.map((cat) => {
                        const maxCount = pulse.categories[0]?.count ?? 1;
                        const pct = Math.round((cat.count / pulse.total_grievances) * 100);
                        return (
                          <div key={cat.category}>
                            <div className="mb-0.5 flex items-center justify-between">
                              <span className="text-xs font-medium">{cat.category}</span>
                              <span className="text-muted-foreground text-xs">
                                {cat.count} ({pct}%)
                              </span>
                            </div>
                            <div className="bg-muted h-2 overflow-hidden rounded-full">
                              <div
                                className="h-full rounded-full bg-blue-500"
                                style={{ width: `${(cat.count / maxCount) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Monthly trend */}
                {pulse.monthly_trend.length > 0 && (
                  <div className="border-border rounded-lg border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Volume Trend</h3>
                    <div className="flex items-end gap-2" style={{ height: 140 }}>
                      {pulse.monthly_trend.map((bucket) => {
                        const maxCount = Math.max(...pulse.monthly_trend.map((b) => b.count), 1);
                        const barHeight = Math.max(Math.round((bucket.count / maxCount) * 100), 8);
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const monthIdx = parseInt(bucket.period.slice(5), 10) - 1;
                        const label = monthNames[monthIdx] ?? bucket.period.slice(5);
                        return (
                          <div key={bucket.period} className="flex flex-1 flex-col items-center gap-1">
                            <span className="text-[10px] font-medium">{bucket.count}</span>
                            <div
                              className="w-full rounded-t bg-blue-500"
                              style={{ height: barHeight }}
                            />
                            <span className="text-muted-foreground text-[10px]">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {pulse.monthly_trend.length >= 2 && (() => {
                      const first = pulse.monthly_trend[0]!.count;
                      const last = pulse.monthly_trend[pulse.monthly_trend.length - 1]!.count;
                      const change = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
                      return change !== 0 ? (
                        <div className="text-muted-foreground mt-2 text-xs">
                          <span className={cn("font-semibold", change > 0 ? "text-red-500" : "text-emerald-500")}>
                            {change > 0 ? `+${change}%` : `${change}%`}
                          </span>{" "}
                          over {pulse.monthly_trend.length} months
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>

              {/* Emerging issues */}
              {pulse.emerging_issues.length > 0 && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Emerging Issues</h3>
                    <span className="text-muted-foreground text-[10px]">7-day follow velocity</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {pulse.emerging_issues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/workspace/grievances/${issue.id}`}
                        className="border-border hover:bg-muted/30 flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">
                            {issue.issue_summary}
                          </p>
                          {issue.issue_category && (
                            <span className="text-muted-foreground text-[10px]">
                              {issue.issue_category}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-center">
                            <div className={cn("text-xs font-bold", issue.follow_velocity > 0 ? "text-amber-500" : "text-muted-foreground")}>
                              {issue.follow_velocity > 0 ? `+${issue.follow_velocity}` : "0"}
                            </div>
                            <div className="text-muted-foreground text-[8px]">
                              this week
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs font-medium">
                              {issue.follow_count}
                            </div>
                            <div className="text-muted-foreground text-[8px]">
                              total
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        ) : tab === "directed" ? (
          /* Directed actions tab */
          data.directed_actions.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center text-sm">
              No actions directed to you yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {data.directed_actions.map((action) => (
                <div key={action.id} className="flex items-start gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {action.email_subject ?? "Action Card"}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      From: {action.sender_name ?? "Anonymous"}
                    </p>
                    {action.issue_summary && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {action.issue_summary}
                      </p>
                    )}
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {new Date(action.sent_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {action.grievance_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 px-2 text-xs"
                        onClick={() => {
                          setRespondingTo({
                            id: action.grievance_id!,
                            issue_summary: action.issue_summary ?? action.email_subject ?? "Grievance",
                            issue_category: null,
                            severity: null,
                            city: null,
                            state: null,
                            status: "open",
                            follow_count: 0,
                            created_at: action.sent_at,
                            sent_action_count: 0,
                          });
                          setResponseBody("");
                        }}
                      >
                        <MessageSquareIcon className="size-3" />
                        Respond
                      </Button>
                    )}
                    {action.grievance_id && (
                      <Link
                        href={`/workspace/grievances/${action.grievance_id}`}
                        className="text-muted-foreground hover:text-foreground text-xs underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : /* Grievances tab (district or trending) */
        grievances.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            No public grievances in your district yet.
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {grievances.map((g) => (
              <div
                key={g.id}
                className="flex items-start gap-4 px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/workspace/grievances/${g.id}`}
                    className="text-sm font-medium leading-snug hover:underline"
                  >
                    {g.issue_summary}
                  </Link>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {g.issue_category && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                        {g.issue_category}
                      </span>
                    )}
                    {g.severity && (
                      <span
                        className={cn(
                          "text-[10px] font-medium",
                          SEVERITY_COLORS[g.severity] ?? "text-muted-foreground",
                        )}
                      >
                        {g.severity.toUpperCase()}
                      </span>
                    )}
                    {g.sent_action_count > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {g.sent_action_count} official
                        {g.sent_action_count !== 1 ? "s" : ""} contacted
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {new Date(g.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      setRespondingTo(g);
                      setResponseBody("");
                    }}
                  >
                    <MessageSquareIcon className="size-3" />
                    Respond
                  </Button>
                  <div className="flex flex-col items-center">
                    <HeartIcon className="text-muted-foreground size-4" />
                    <span className="text-muted-foreground text-xs">
                      {g.follow_count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Respond Modal */}
      {respondingTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background mx-4 w-full max-w-lg rounded-lg border shadow-xl">
            <div className="flex items-start justify-between border-b px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold">Respond to Grievance</h3>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {respondingTo.issue_summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingTo(null)}
                className="text-muted-foreground hover:text-foreground ml-2 shrink-0"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                placeholder="Write your public response to this constituent grievance..."
                className="border-border bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                rows={5}
                maxLength={5000}
              />
              <div className="text-muted-foreground mt-1 text-right text-[10px]">
                {responseBody.length}/5000
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRespondingTo(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!responseBody.trim() || submitting}
                onClick={() => void handleSubmitResponse()}
              >
                {submitting ? (
                  <Loader2Icon className="mr-1.5 size-3 animate-spin" />
                ) : (
                  <MessageSquareIcon className="mr-1.5 size-3" />
                )}
                Publish Response
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
