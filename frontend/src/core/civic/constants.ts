import {
  Building2Icon,
  ColumnsIcon,
  GavelIcon,
  GraduationCapIcon,
  LandmarkIcon,
  LibraryIcon,
  ShieldIcon,
  VoteIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { type InstitutionCategory } from "./types";

export const PHILADELPHIA_CENTER: [number, number] = [-75.1652, 39.9526];
export const DEFAULT_ZOOM = 11;

export const CATEGORY_COLORS: Record<InstitutionCategory, string> = {
  "city-government": "var(--chart-1)",
  "city-council": "var(--chart-2)",
  "us-congress": "var(--chart-3)",
  "pa-state-senate": "var(--chart-4)",
  "pa-state-house": "var(--chart-3)",
  education: "var(--chart-5)",
  police: "var(--muted-foreground)",
  community: "var(--chart-5)",
};

// Fallback hex colors for contexts where CSS vars don't work (e.g., MapLibre layers)
export const CATEGORY_HEX_COLORS: Record<InstitutionCategory, string> = {
  "city-government": "#c2603d",
  "city-council": "#3d8c84",
  "us-congress": "#4a5f7a",
  "pa-state-senate": "#c9a23a",
  "pa-state-house": "#6b7a5e",
  education: "#c08a2e",
  police: "#888888",
  community: "#7a6b5e",
};

export const CATEGORY_LABELS: Record<InstitutionCategory, string> = {
  "city-government": "City Government",
  "city-council": "City Council",
  "us-congress": "US Congress",
  "pa-state-senate": "PA State Senate",
  "pa-state-house": "PA State House",
  education: "Education",
  police: "Police",
  community: "Community",
};

export const CATEGORY_ICONS: Record<InstitutionCategory, LucideIcon> = {
  "city-government": Building2Icon,
  "city-council": GavelIcon,
  "us-congress": LandmarkIcon,
  "pa-state-senate": ColumnsIcon,
  "pa-state-house": VoteIcon,
  education: GraduationCapIcon,
  police: ShieldIcon,
  community: LibraryIcon,
};

export const ISSUE_CATEGORIES = [
  "abandoned-vehicles",
  "illegal-dumping",
  "infrastructure",
  "graffiti",
  "housing",
  "safety",
  "vacant-lots",
  "permits",
  "utilities",
  "other",
] as const;

export const ALL_CATEGORIES: InstitutionCategory[] = [
  "city-government",
  "city-council",
  "us-congress",
  "pa-state-senate",
  "pa-state-house",
  "education",
  "police",
  "community",
];
