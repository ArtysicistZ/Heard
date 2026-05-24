"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";
import { Popup } from "react-map-gl/maplibre";

import { Button } from "@/components/ui/button";
import { CATEGORY_HEX_COLORS, CATEGORY_ICONS, CATEGORY_LABELS } from "@/core/civic/constants";
import { type Institution, type InstitutionStats, type MapViewMode } from "@/core/civic/types";
import { useI18n } from "@/core/i18n/hooks";

interface InstitutionPopupProps {
  institution: Institution;
  stats?: InstitutionStats;
  viewMode: MapViewMode;
  onClose: () => void;
  onReportFollowUp: () => void;
}

export function InstitutionPopup({
  institution,
  stats,
  viewMode,
  onClose,
  onReportFollowUp,
}: InstitutionPopupProps) {
  const { t } = useI18n();
  const categoryColor = CATEGORY_HEX_COLORS[institution.category];
  const categoryLabel = CATEGORY_LABELS[institution.category];
  const CategoryIcon = CATEGORY_ICONS[institution.category];
  const resolutionRate = stats?.resolutionRate ?? 0;
  const resolutionPct = Math.round(resolutionRate * 100);

  return (
    <Popup
      longitude={institution.coordinates[0]}
      latitude={institution.coordinates[1]}
      anchor="bottom"
      offset={20}
      closeButton={false}
      closeOnClick={false}
      className="[&_.maplibregl-popup-content]:!bg-transparent [&_.maplibregl-popup-content]:!p-0 [&_.maplibregl-popup-content]:!shadow-none [&_.maplibregl-popup-tip]:!border-t-card"
    >
      <div className="bg-card border-border w-80 rounded-xl border p-4 shadow-lg">
        {/* Close button */}
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 p-1 transition-colors"
        >
          <XIcon className="size-4" />
        </button>

        {/* Category badge */}
        <div
          className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{
            backgroundColor: `${categoryColor}20`,
            color: categoryColor,
          }}
        >
          <CategoryIcon size={10} strokeWidth={2.5} />
          {categoryLabel}
        </div>

        {/* Institution info */}
        <h3 className="text-foreground text-base font-semibold leading-tight">
          {institution.name}
        </h3>
        {institution.officeholder && (
          <p className="text-muted-foreground mt-0.5 text-sm">
            {institution.officeholder}
            {institution.district ? ` - ${institution.district}` : ""}
          </p>
        )}
        <p className="text-muted-foreground mt-1 text-sm">{institution.address}</p>
        <p className="text-muted-foreground text-sm">{institution.phone}</p>

        {/* Contacts section */}
        {stats && (
          <>
            <div className="border-border mt-3 border-t pt-3">
              <div className="text-muted-foreground mb-1.5 text-[10px] font-medium uppercase tracking-wider">
                {t.civicMap.contacts}
              </div>
              <div className="text-sm">
                <span className="font-semibold">{stats.totalContacts}</span>{" "}
                <span className="text-muted-foreground">{t.civicMap.totalContacts}</span>
                <span className="text-muted-foreground mx-2">&middot;</span>
                <span className="font-semibold">{stats.contactsLast30Days}</span>{" "}
                <span className="text-muted-foreground">{t.civicMap.contactsThisMonth}</span>
              </div>
              {viewMode === "voter" && stats.totalContacts > 0 && (
                <p className="text-muted-foreground mt-1 text-xs">
                  {t.civicMap.nearYou(stats.totalContacts)}
                </p>
              )}
            </div>

            {/* Resolution rate */}
            <div className="border-border mt-3 border-t pt-3">
              <div className="text-muted-foreground mb-1.5 text-[10px] font-medium uppercase tracking-wider">
                {t.civicMap.resolutionRate}
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${resolutionPct}%`,
                      backgroundColor: resolutionRate >= 0.25 ? "#3d8c84" : "#c2603d",
                    }}
                  />
                </div>
                <span className="text-sm font-semibold">{resolutionPct}%</span>
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {stats.resolvedCount} {t.civicMap.resolved.toLowerCase()}
                <span className="mx-1">&middot;</span>
                {stats.pendingCount} {t.civicMap.pending.toLowerCase()}
              </p>
            </div>

            {/* Top issues */}
            {stats.topIssueCategories.length > 0 && (
              <div className="border-border mt-3 border-t pt-3">
                <div className="text-muted-foreground mb-1.5 text-[10px] font-medium uppercase tracking-wider">
                  {t.civicMap.topIssues}
                </div>
                <div className="flex flex-wrap gap-1">
                  {stats.topIssueCategories.slice(0, 3).map((issue) => (
                    <span
                      key={issue.category}
                      className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[11px]"
                    >
                      {issue.category}
                      {viewMode === "candidate" && stats.totalContacts > 0 && (
                        <span className="text-muted-foreground ml-1">
                          {Math.round((issue.count / stats.totalContacts) * 100)}%
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onReportFollowUp}>
            {t.civicMap.reportFollowUp}
          </Button>
          <Button variant="default" size="sm" className="flex-1" asChild>
            <Link href="/workspace/chats">
              {t.civicMap.writeToThem}
            </Link>
          </Button>
        </div>
      </div>
    </Popup>
  );
}
