"use client";

import { HeartIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Marker, Popup } from "react-map-gl/maplibre";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface GrievanceMarkerData {
  id: string;
  issue_summary: string;
  issue_category: string | null;
  severity: string | null;
  display_lat: number;
  display_lng: number;
  city: string | null;
  state: string | null;
  follow_count: number;
  is_following: boolean;
  sent_action_count: number;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

export function GrievanceMarkers() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<GrievanceMarkerData[]>([]);
  const [selected, setSelected] = useState<GrievanceMarkerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ page_size: "100" });
    if (user?.id) params.set("user_id", user.id);

    fetch(`${getBackendBaseURL()}/api/civic/grievances?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const valid = (data.grievances ?? []).filter(
          (g: GrievanceMarkerData) => g.display_lat && g.display_lng,
        );
        setGrievances(valid);
      })
      .catch(() => {
        // Silently fail — grievances layer is optional
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleFollow = useCallback(
    async (grievanceId: string) => {
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
        if (selected?.id === grievanceId) {
          setSelected((s) =>
            s
              ? {
                  ...s,
                  follow_count: data.follow_count,
                  is_following: data.following,
                }
              : null,
          );
        }
      } catch {
        toast.error("Failed to update follow");
      }
    },
    [user, selected],
  );

  if (loading || grievances.length === 0) return null;

  return (
    <>
      {grievances.map((g) => {
        const color = SEVERITY_COLORS[g.severity ?? ""] ?? "#6b7280";
        return (
          <Marker
            key={g.id}
            longitude={g.display_lng}
            latitude={g.display_lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelected(g);
            }}
          >
            <div
              className="flex size-6 cursor-pointer items-center justify-center rounded-full border-2 border-white shadow-md transition-transform hover:scale-125"
              style={{ backgroundColor: color }}
              title={g.issue_summary.slice(0, 60)}
            >
              <span className="text-[9px] font-bold text-white">!</span>
            </div>
          </Marker>
        );
      })}

      {selected && (
        <Popup
          longitude={selected.display_lng}
          latitude={selected.display_lat}
          anchor="bottom"
          onClose={() => setSelected(null)}
          closeOnClick={false}
          maxWidth="280px"
        >
          <div className="flex flex-col gap-2 p-1">
            <p className="text-xs font-medium leading-snug">
              {selected.issue_summary}
            </p>
            <div className="flex flex-wrap gap-1">
              {selected.issue_category && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                  {selected.issue_category}
                </span>
              )}
              {selected.severity && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
                  style={{
                    backgroundColor:
                      SEVERITY_COLORS[selected.severity] ?? "#6b7280",
                  }}
                >
                  {selected.severity.toUpperCase()}
                </span>
              )}
              {selected.sent_action_count > 0 && (
                <span className="text-[10px] text-gray-500">
                  {selected.sent_action_count} official
                  {selected.sent_action_count !== 1 ? "s" : ""} contacted
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                {new Date(selected.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    "h-7 gap-1 px-2 text-xs",
                    selected.is_following && "text-red-500",
                  )}
                  onClick={() => void handleFollow(selected.id)}
                >
                  <HeartIcon
                    className={cn(
                      "size-3.5",
                      selected.is_following && "fill-current",
                    )}
                  />
                  {selected.follow_count}
                </Button>
                <Link
                  href={`/workspace/grievances/${selected.id}`}
                  className="text-[10px] font-medium text-blue-500 hover:underline"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </Popup>
      )}
    </>
  );
}
