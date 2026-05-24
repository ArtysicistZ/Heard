"use client";

import { ListIcon, MapIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  WorkspaceBody,
  WorkspaceContainer,
  WorkspaceHeader,
} from "@/components/workspace/workspace-container";
import { cn } from "@/lib/utils";

const CivicMap = dynamic(
  () => import("@/components/workspace/civic-map/civic-map"),
  { ssr: false },
);

const GrievanceFeed = dynamic(
  () =>
    import("@/app/workspace/grievances/page").then((mod) => ({
      default: mod.default,
    })),
  { ssr: false },
);

type ViewMode = "map" | "list";

export default function CommunityPage() {
  const [view, setView] = useState<ViewMode>("map");

  useEffect(() => {
    document.title = "Community - Heard";
  }, []);

  return (
    <WorkspaceContainer>
      <WorkspaceHeader>
        <div className="flex items-center gap-1 rounded-md border p-0.5">
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 gap-1.5 px-2.5 text-xs",
              view === "map" && "bg-muted",
            )}
            onClick={() => setView("map")}
          >
            <MapIcon className="size-3.5" />
            Map
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 gap-1.5 px-2.5 text-xs",
              view === "list" && "bg-muted",
            )}
            onClick={() => setView("list")}
          >
            <ListIcon className="size-3.5" />
            List
          </Button>
        </div>
      </WorkspaceHeader>
      <WorkspaceBody className={view === "map" ? "overflow-hidden" : ""}>
        {view === "map" ? <CivicMap /> : <GrievanceFeed />}
      </WorkspaceBody>
    </WorkspaceContainer>
  );
}
