"use client";

import { LandmarkIcon, UsersIcon } from "lucide-react";
import { useCallback } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALL_CATEGORIES,
  CATEGORY_HEX_COLORS,
  CATEGORY_ICONS,
} from "@/core/civic/constants";
import { type InstitutionCategory, type MapViewMode } from "@/core/civic/types";
import { useI18n } from "@/core/i18n/hooks";

interface CivicMapControlsProps {
  viewMode: MapViewMode;
  onViewModeChange: (mode: MapViewMode) => void;
  selectedCategories: Set<InstitutionCategory>;
  onSelectedCategoriesChange: (categories: Set<InstitutionCategory>) => void;
}

export function CivicMapControls({
  viewMode,
  onViewModeChange,
  selectedCategories,
  onSelectedCategoriesChange,
}: CivicMapControlsProps) {
  const { t } = useI18n();

  const allSelected = selectedCategories.size === ALL_CATEGORIES.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectedCategoriesChange(new Set());
    } else {
      onSelectedCategoriesChange(new Set(ALL_CATEGORIES));
    }
  }, [allSelected, onSelectedCategoriesChange]);

  const toggleCategory = useCallback(
    (category: InstitutionCategory) => {
      const next = new Set(selectedCategories);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      onSelectedCategoriesChange(next);
    },
    [selectedCategories, onSelectedCategoriesChange],
  );

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
    <div className="bg-background/85 border-border absolute top-4 left-4 z-10 w-56 rounded-xl border p-3 shadow-sm backdrop-blur-sm">
      {/* View Toggle */}
      <Tabs
        value={viewMode}
        onValueChange={(v) => onViewModeChange(v as MapViewMode)}
      >
        <TabsList className="h-8 w-full">
          <TabsTrigger value="voter" className="gap-1 text-xs">
            <UsersIcon className="size-3.5" />
            {t.civicMap.voterView}
          </TabsTrigger>
          <TabsTrigger value="candidate" className="gap-1 text-xs">
            <LandmarkIcon className="size-3.5" />
            {t.civicMap.candidateView}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Category Filter */}
      <div className="mt-3">
        <div className="text-muted-foreground mb-2 text-[10px] font-medium uppercase tracking-wider">
          {t.civicMap.filterByCategory}
        </div>

        {/* All toggle */}
        <label className="flex cursor-pointer items-center gap-2 py-1">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="accent-foreground size-3.5 rounded"
          />
          <span className="text-foreground text-sm font-medium">
            {t.civicMap.allCategories}
          </span>
        </label>

        <div className="border-border my-1 border-t" />

        {/* Individual categories */}
        {ALL_CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          return (
            <label
              key={category}
              className="flex cursor-pointer items-center gap-2 py-1"
            >
              <input
                type="checkbox"
                checked={selectedCategories.has(category)}
                onChange={() => toggleCategory(category)}
                className="accent-foreground size-3.5 rounded"
              />
              <span
                className="flex size-3.5 items-center justify-center rounded-full"
                style={{ backgroundColor: CATEGORY_HEX_COLORS[category] }}
              >
                <Icon size={8} className="text-white" strokeWidth={2.5} />
              </span>
              <span className="text-foreground text-sm">
                {categoryTranslations[category]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
