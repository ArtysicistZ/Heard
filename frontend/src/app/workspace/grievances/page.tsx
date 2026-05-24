"use client";

import {
  HeartIcon,
  Loader2Icon,
  MapPinIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface GrievanceItem {
  id: string;
  issue_summary: string;
  issue_category: string | null;
  severity: string | null;
  city: string | null;
  state: string | null;
  council_district: string | null;
  congressional_dist: string | null;
  status: string;
  follow_count: number;
  is_following: boolean;
  created_at: string;
  sent_action_count: number;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

export default function GrievanceFeed() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState<"recent" | "popular">("recent");
  const [page, setPage] = useState(1);

  const fetchGrievances = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      params.set("sort", sort);
      params.set("page", String(page));
      params.set("page_size", "20");
      if (user?.id) params.set("user_id", user.id);

      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/grievances?${params.toString()}`,
      );
      if (!resp.ok) throw new Error("Failed to fetch");
      const data = await resp.json();
      setGrievances(data.grievances);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load grievances");
    } finally {
      setLoading(false);
    }
  }, [query, sort, page, user?.id]);

  useEffect(() => {
    void fetchGrievances();
  }, [fetchGrievances]);

  const handleFollow = async (grievanceId: string) => {
    if (!user) {
      toast.error("Please sign in to follow grievances");
      return;
    }
    try {
      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/grievances/${grievanceId}/follow?user_id=${user.id}`,
        { method: "POST" },
      );
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      setGrievances((prev) =>
        prev.map((g) =>
          g.id === grievanceId
            ? {
                ...g,
                follow_count: data.follow_count,
                is_following: data.following,
              }
            : g,
        ),
      );
    } catch {
      toast.error("Failed to update follow");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(searchInput);
    setPage(1);
  };

  return (
    <div className="flex size-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold">Community Grievances</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Public issues reported by constituents in your area
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
        <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
          <div className="border-border bg-background flex flex-1 items-center rounded-md border px-3 py-1.5">
            <SearchIcon className="text-muted-foreground mr-2 size-4" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search grievances..."
              className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
            />
          </div>
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={sort === "recent" ? "default" : "ghost"}
            onClick={() => {
              setSort("recent");
              setPage(1);
            }}
          >
            Recent
          </Button>
          <Button
            size="sm"
            variant={sort === "popular" ? "default" : "ghost"}
            onClick={() => {
              setSort("popular");
              setPage(1);
            }}
          >
            Popular
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2Icon className="size-6 animate-spin" />
          </div>
        ) : grievances.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            {query
              ? "No grievances match your search."
              : "No public grievances yet. Be the first to make your voice heard!"}
          </div>
        ) : (
          <div className="flex flex-col divide-y">
            {grievances.map((g) => (
              <Link
                key={g.id}
                href={`/workspace/grievances/${g.id}`}
                className="hover:bg-muted/30 flex items-start gap-4 px-6 py-4 transition-colors"
              >
                <div className="min-w-0 flex-1">
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
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleFollow(g.id);
                  }}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-colors",
                    g.is_following
                      ? "text-red-500"
                      : "text-muted-foreground hover:text-red-500",
                  )}
                >
                  <HeartIcon
                    className={cn(
                      "size-5",
                      g.is_following && "fill-current",
                    )}
                  />
                  <span className="text-xs font-medium">{g.follow_count}</span>
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between border-t px-6 py-3">
          <span className="text-muted-foreground text-xs">
            {total} total grievance{total !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
