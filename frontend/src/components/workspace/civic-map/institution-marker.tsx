"use client";

import { useCallback } from "react";
import { Marker } from "react-map-gl/maplibre";

import { CATEGORY_HEX_COLORS, CATEGORY_ICONS } from "@/core/civic/constants";
import { type Institution, type InstitutionStats, type MapViewMode } from "@/core/civic/types";

interface InstitutionMarkerProps {
  institution: Institution;
  stats?: InstitutionStats;
  viewMode: MapViewMode;
  isSelected: boolean;
  onClick: (institution: Institution) => void;
}

function getMarkerSize(totalContacts: number): number {
  return 28 + Math.min(16, Math.floor(totalContacts / 10));
}

function getResolutionBadgeColor(rate: number): string {
  if (rate >= 0.5) return "#3d8c84";
  if (rate >= 0.25) return "#c9a23a";
  return "#c2603d";
}

export function InstitutionMarker({
  institution,
  stats,
  viewMode,
  isSelected,
  onClick,
}: InstitutionMarkerProps) {
  const color = CATEGORY_HEX_COLORS[institution.category];
  const IconComponent = CATEGORY_ICONS[institution.category];
  const size = getMarkerSize(stats?.totalContacts ?? 0);
  const iconSize = Math.round(size * 0.45);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick(institution);
    },
    [institution, onClick],
  );

  return (
    <Marker
      longitude={institution.coordinates[0]}
      latitude={institution.coordinates[1]}
      anchor="center"
    >
      <div
        className="relative cursor-pointer transition-transform duration-150 ease-out hover:scale-[1.15]"
        style={{ width: size, height: size }}
        onClick={handleClick}
      >
        <div
          className="flex size-full items-center justify-center rounded-full shadow-sm"
          style={{
            backgroundColor: color,
            opacity: 0.85,
            border: "2px solid white",
            boxShadow: isSelected
              ? `0 0 0 3px ${color}40`
              : "0 1px 3px rgba(0,0,0,0.12)",
          }}
        >
          <IconComponent
            size={iconSize}
            className="text-white"
            strokeWidth={2}
          />
        </div>

        {viewMode === "candidate" && stats && stats.totalContacts > 0 && (
          <div
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full border border-white"
            style={{
              width: 20,
              height: 20,
              backgroundColor: getResolutionBadgeColor(stats.resolutionRate),
              fontSize: 9,
              fontWeight: 700,
              color: "white",
              lineHeight: 1,
            }}
          >
            {Math.round(stats.resolutionRate * 100)}
          </div>
        )}
      </div>
    </Marker>
  );
}
