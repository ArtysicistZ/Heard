"use client";

import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import { type Institution, type InstitutionStats } from "@/core/civic/types";

interface HeatmapLayerProps {
  institutions: Institution[];
  stats: InstitutionStats[];
}

export function HeatmapLayer({ institutions, stats }: HeatmapLayerProps) {
  const geojsonData = useMemo(() => {
    const statsMap = new Map<string, InstitutionStats>();
    stats.forEach((s) => statsMap.set(s.institutionId, s));

    const features: GeoJSON.Feature[] = [];

    for (const inst of institutions) {
      const instStats = statsMap.get(inst.id);
      if (!instStats || instStats.totalContacts === 0) continue;

      // Create multiple jittered points around each institution
      // to simulate distributed contacts
      const count = Math.min(instStats.totalContacts, 40); // cap visual points
      // Scale jitter with contact count for more natural spread
      const jitterScale =
        0.015 + (Math.min(instStats.totalContacts, 100) / 100) * 0.015;

      for (let i = 0; i < count; i++) {
        // Deterministic jitter based on institution id and index
        const seed = hashCode(`${inst.id}-${i}`);
        const jitterLng = ((seed % 1000) / 1000 - 0.5) * jitterScale;
        const jitterLat =
          (((seed >> 10) % 1000) / 1000 - 0.5) * jitterScale;

        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              inst.coordinates[0] + jitterLng,
              inst.coordinates[1] + jitterLat,
            ],
          },
          properties: {
            weight: instStats.totalContacts / 180, // normalize to new max
          },
        });
      }
    }

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [institutions, stats]);

  return (
    <Source id="heatmap-source" type="geojson" data={geojsonData}>
      <Layer
        id="heatmap-layer"
        type="heatmap"
        paint={{
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 0.5,
          "heatmap-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            9,
            20,
            13,
            35,
          ],
          "heatmap-opacity": 0.7,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.2,
            "rgba(255,237,213,0.4)",
            0.4,
            "rgba(251,191,36,0.6)",
            0.7,
            "rgba(234,88,12,0.7)",
            1,
            "rgba(185,28,28,0.8)",
          ],
        }}
      />
    </Source>
  );
}

// Simple deterministic hash for jittering
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
