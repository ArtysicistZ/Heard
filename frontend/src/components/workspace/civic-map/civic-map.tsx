"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useTheme } from "next-themes";
import { useCallback, useMemo, useState } from "react";
import MapGL, { NavigationControl } from "react-map-gl/maplibre";

import {
  PHILADELPHIA_CENTER,
  DEFAULT_ZOOM,
  ALL_CATEGORIES,
} from "@/core/civic/constants";
import { useInstitutions, useAllStats } from "@/core/civic/hooks";
import { type Institution, type InstitutionStats, type InstitutionCategory, type MapViewMode } from "@/core/civic/types";

import { CivicMapControls } from "./civic-map-controls";
import { FollowUpDialog } from "./follow-up-dialog";
import { GrievanceMarkers } from "./grievance-markers";
import { HeatmapLayer } from "./heatmap-layer";
import { InstitutionMarker } from "./institution-marker";
import { InstitutionPopup } from "./institution-popup";
import { MapLegend } from "./map-legend";

const LIGHT_STYLE = "/map-styles/heard-light.json";
const DARK_STYLE = "/map-styles/heard-dark.json";

export default function CivicMap() {
  const { resolvedTheme } = useTheme();
  const { data: institutions } = useInstitutions();
  const { data: stats } = useAllStats();

  const [viewMode, setViewMode] = useState<MapViewMode>("voter");
  const [selectedCategories, setSelectedCategories] = useState<Set<InstitutionCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const mapStyle = resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE;

  const statsMap = useMemo(() => {
    const map = new Map<string, InstitutionStats>();
    stats?.forEach((s) => map.set(s.institutionId, s));
    return map;
  }, [stats]);

  const filteredInstitutions = useMemo(() => {
    return institutions?.filter((inst) => selectedCategories.has(inst.category)) ?? [];
  }, [institutions, selectedCategories]);

  const handleMarkerClick = useCallback((institution: Institution) => {
    setSelectedInstitution(institution);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedInstitution(null);
  }, []);

  const handleReportFollowUp = useCallback(() => {
    setShowFollowUp(true);
  }, []);

  return (
    <div className="relative size-full">
      <MapGL
        initialViewState={{
          longitude: PHILADELPHIA_CENTER[0],
          latitude: PHILADELPHIA_CENTER[1],
          zoom: DEFAULT_ZOOM,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        attributionControl={false}
        onClick={(e) => {
          // Close popup when clicking on the map (not on a marker)
          if (!e.features?.length) {
            setSelectedInstitution(null);
          }
        }}
      >
        <NavigationControl position="bottom-left" />

        {viewMode === "candidate" && stats && institutions && (
          <HeatmapLayer institutions={institutions} stats={stats} />
        )}

        {filteredInstitutions.map((institution) => {
          const instStats = statsMap.get(institution.id);
          return (
            <InstitutionMarker
              key={institution.id}
              institution={institution}
              stats={instStats}
              viewMode={viewMode}
              isSelected={selectedInstitution?.id === institution.id}
              onClick={handleMarkerClick}
            />
          );
        })}

        {/* Public grievance markers */}
        <GrievanceMarkers />

        {selectedInstitution && (
          <InstitutionPopup
            institution={selectedInstitution}
            stats={statsMap.get(selectedInstitution.id)}
            viewMode={viewMode}
            onClose={handleClosePopup}
            onReportFollowUp={handleReportFollowUp}
          />
        )}
      </MapGL>

      <CivicMapControls
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        selectedCategories={selectedCategories}
        onSelectedCategoriesChange={setSelectedCategories}
      />

      <MapLegend viewMode={viewMode} />

      <FollowUpDialog
        open={showFollowUp}
        onOpenChange={setShowFollowUp}
        institution={selectedInstitution}
      />
    </div>
  );
}
