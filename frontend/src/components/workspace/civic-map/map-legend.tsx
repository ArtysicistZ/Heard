"use client";

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

import { ALL_CATEGORIES, CATEGORY_HEX_COLORS, CATEGORY_ICONS } from "@/core/civic/constants";
import { type MapViewMode, type InstitutionCategory } from "@/core/civic/types";
import { useI18n } from "@/core/i18n/hooks";

interface MapLegendProps {
  viewMode: MapViewMode;
}

export function MapLegend({ viewMode }: MapLegendProps) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);

  const categoryTranslations: Record<InstitutionCategory, string> = {
    "city-government": t.civicMap.categories.cityGovernment,
    "city-council": t.civicMap.categories.cityCouncil,
    "us-congress": t.civicMap.categories.usCongress,
    "pa-state-senate": t.civicMap.categories.paStateSenate,
    "pa-state-house": t.civicMap.categories.paStateHouse,
    education: t.civicMap.categories.education,
    police: t.civicMap.categories.police,
    community: t.civicMap.categories.community,
  };

  return (
    <div className="bg-background/85 border-border absolute right-4 bottom-4 z-10 w-44 rounded-xl border shadow-sm backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between p-3 text-[10px] font-semibold uppercase tracking-wider transition-colors"
      >
        {t.civicMap.legend}
        {collapsed ? (
          <ChevronUpIcon className="size-3" />
        ) : (
          <ChevronDownIcon className="size-3" />
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-3 pb-3">
          {/* Category colors with icons */}
          <div className="space-y-0.5">
            {ALL_CATEGORIES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <div key={category} className="flex items-center gap-2 py-0.5">
                  <span
                    className="flex size-4 items-center justify-center rounded-full"
                    style={{ backgroundColor: CATEGORY_HEX_COLORS[category] }}
                  >
                    <Icon size={9} className="text-white" strokeWidth={2.5} />
                  </span>
                  <span className="text-foreground text-xs">
                    {categoryTranslations[category]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Size legend */}
          <div className="border-border mt-2 border-t pt-2">
            <div className="flex items-center gap-2 py-0.5">
              <span
                className="inline-block size-2.5 rounded-full border border-current opacity-50"
              />
              <span className="text-muted-foreground text-xs">
                {t.civicMap.fewContacts}
              </span>
            </div>
            <div className="flex items-center gap-2 py-0.5">
              <span
                className="inline-block size-4 rounded-full border border-current opacity-50"
              />
              <span className="text-muted-foreground text-xs">
                {t.civicMap.manyContacts}
              </span>
            </div>
          </div>

          {/* Heatmap legend (candidate view only) */}
          {viewMode === "candidate" && (
            <div className="border-border mt-2 border-t pt-2">
              <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                Issue Density
              </div>
              <div
                className="h-2 w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, rgba(255,237,213,0.4), rgba(251,191,36,0.6), rgba(234,88,12,0.7), rgba(185,28,28,0.8))",
                }}
              />
              <div className="text-muted-foreground mt-0.5 flex justify-between text-[9px]">
                <span>Low</span>
                <span>High</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
