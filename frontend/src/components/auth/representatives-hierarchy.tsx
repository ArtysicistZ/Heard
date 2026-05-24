"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OfficialInfo {
  name: string;
  party: string;
  title: string;
  heard_level: string;
  district_label: string;
  district_type: string;
  district_id: string;
  state: string;
  chamber_name: string;
}

interface HierarchyGroup {
  label: string;
  officials: OfficialInfo[];
}

interface HierarchyTier {
  id: TierKey;
  label: string;
  count: number;
  groups: HierarchyGroup[];
}

// ---------------------------------------------------------------------------
// Party helpers
// ---------------------------------------------------------------------------

const PARTY_ABBREV: Record<string, string> = {
  Democrat: "D",
  Democratic: "D",
  Republican: "R",
  "Working Families": "WF",
  Independent: "I",
  Green: "G",
  Libertarian: "L",
  "No Party": "",
  Nonpartisan: "",
};

const PARTY_COLORS: Record<string, string> = {
  Democrat: "#2563eb",
  Democratic: "#2563eb",
  Republican: "#dc2626",
  Independent: "#6b7280",
  "Working Families": "#7c3aed",
  Green: "#16a34a",
  Libertarian: "#eab308",
};

function abbreviateParty(party: string): string {
  if (!party?.trim()) return "";
  if (PARTY_ABBREV[party] !== undefined) return PARTY_ABBREV[party];
  return party.charAt(0).toUpperCase();
}

function getPartyColor(party: string): string {
  return PARTY_COLORS[party] ?? "#6b7280";
}

// ---------------------------------------------------------------------------
// Title priority — lower = higher authority = shown first
// ---------------------------------------------------------------------------

const TITLE_PATTERNS: [RegExp, number][] = [
  [/^governor$/i, 1],
  [/^mayor$/i, 1],
  [/^lt\.?\s*governor$/i, 2],
  [/^lieutenant\s+governor$/i, 2],
  [/^deputy\s+mayor$/i, 2],
  [/^attorney\s+general$/i, 3],
  [/^auditor\s+general$/i, 4],
  [/^comptroller$/i, 4],
  [/^treasurer$/i, 5],
  [/^state\s+treasurer$/i, 5],
  [/^secretary\s+of/i, 6],
  [/^city\s+controller$/i, 7],
  [/^controller$/i, 7],
  [/^sheriff$/i, 8],
  [/^register\s+of/i, 9],
  [/^district\s+attorney$/i, 9],
  [/commissioner/i, 10],
  [/^senator$/i, 11],
  [/^representative$/i, 11],
  [/^council\s+president$/i, 11],
  [/^councilmember$/i, 12],
  [/^council\s*member$/i, 12],
];

function titlePriority(title: string): number {
  for (const [pattern, priority] of TITLE_PATTERNS) {
    if (pattern.test(title)) return priority;
  }
  return 99;
}

// ---------------------------------------------------------------------------
// Title shortening
// ---------------------------------------------------------------------------

const TITLE_SHORTEN: [RegExp, string][] = [
  [/^Secretary of (.+)/i, "Sec. of $1"],
  [/^Commissioner of (.+)/i, "Cmsr. of $1"],
  [/^Register of (.+)/i, "Reg. of $1"],
  [/and Natural Resources/i, "& Nat. Resources"],
  [/and Revenue/i, "& Revenue"],
  [/of the Commonwealth/i, "of Cwlth."],
];

function shortenTitle(title: string): string {
  let t = title;
  for (const [pattern, rep] of TITLE_SHORTEN) {
    t = t.replace(pattern, rep);
  }
  return t;
}

// ---------------------------------------------------------------------------
// At-large detection
// ---------------------------------------------------------------------------

function isAtLarge(districtId: string): boolean {
  const n = districtId.trim().toLowerCase().replace(/[-_]/g, " ");
  return n === "at large";
}

// ---------------------------------------------------------------------------
// Grouping logic
// ---------------------------------------------------------------------------

type TierKey = "federal" | "state" | "local" | "other";

const DISTRICT_TYPE_TO_TIER: Record<string, TierKey> = {
  NATIONAL_UPPER: "federal",
  NATIONAL_LOWER: "federal",
  STATE_EXEC: "state",
  STATE_UPPER: "state",
  STATE_LOWER: "state",
  LOCAL_EXEC: "local",
  LOCAL: "local",
};

const DISTRICT_TYPE_TO_GROUP: Record<string, string> = {
  NATIONAL_UPPER: "U.S. Senate",
  NATIONAL_LOWER: "U.S. House",
  STATE_EXEC: "Statewide Officers",
  STATE_UPPER: "State Senate",
  STATE_LOWER: "State House",
  LOCAL_EXEC: "City Officers",
  LOCAL: "City Council",
};

const TIER_ORDER: TierKey[] = ["federal", "state", "local", "other"];

const GROUP_ORDER: Record<TierKey, string[]> = {
  federal: ["U.S. Senate", "U.S. House"],
  state: ["Statewide Officers", "State Senate", "State House"],
  local: ["City Officers", "City Council"],
  other: ["Other Officials"],
};

function sortOfficials(officials: OfficialInfo[]): OfficialInfo[] {
  return [...officials].sort((a, b) => {
    const pa = titlePriority(a.title);
    const pb = titlePriority(b.title);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name);
  });
}

function buildHierarchy(
  officials: OfficialInfo[],
  cityName: string | null,
  stateName: string | null,
): HierarchyTier[] {
  const seen = new Set<string>();
  const deduped: OfficialInfo[] = [];
  for (const o of officials) {
    const key = `${o.name}|${o.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(o);
    }
  }

  const tierGroups: Record<TierKey, Record<string, OfficialInfo[]>> = {
    federal: {},
    state: {},
    local: {},
    other: {},
  };

  for (const o of deduped) {
    const tier = DISTRICT_TYPE_TO_TIER[o.district_type] ?? "other";
    const group = DISTRICT_TYPE_TO_GROUP[o.district_type] ?? "Other Officials";
    tierGroups[tier][group] ??= [];
    tierGroups[tier][group].push(o);
  }

  // Split council: at-large vs district
  const council = tierGroups.local["City Council"];
  if (council && council.length > 0) {
    const al = council.filter((o) => isAtLarge(o.district_id));
    const dist = council.filter((o) => !isAtLarge(o.district_id));
    if (al.length > 0 && dist.length > 0) {
      delete tierGroups.local["City Council"];
      tierGroups.local["Council At-Large"] = al;
      tierGroups.local["Council District"] = dist;
    }
  }

  const result: HierarchyTier[] = [];
  for (const tierKey of TIER_ORDER) {
    const groupMap = tierGroups[tierKey];
    const allOfficials = Object.values(groupMap).flat();
    if (allOfficials.length === 0) continue;

    let tierLabel: string;
    if (tierKey === "federal") tierLabel = "Federal";
    else if (tierKey === "state")
      tierLabel = stateName ? `State of ${stateName}` : "State";
    else if (tierKey === "local")
      tierLabel = cityName ? `City of ${cityName}` : "Local";
    else tierLabel = "Other";

    const order =
      tierKey === "local" && tierGroups.local["Council At-Large"]
        ? ["City Officers", "Council At-Large", "Council District"]
        : (GROUP_ORDER[tierKey] ?? []);

    const groups: HierarchyGroup[] = [];
    const used = new Set<string>();
    for (const gName of order) {
      if (groupMap[gName]) {
        groups.push({
          label: gName,
          officials: sortOfficials(groupMap[gName]),
        });
        used.add(gName);
      }
    }
    for (const [gName, offs] of Object.entries(groupMap)) {
      if (!used.has(gName)) {
        groups.push({ label: gName, officials: sortOfficials(offs) });
      }
    }

    result.push({
      id: tierKey,
      label: tierLabel,
      count: allOfficials.length,
      groups,
    });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Connector primitives
// ---------------------------------------------------------------------------

function VLine({ h = "h-4" }: { h?: string }) {
  return <div className={cn("mx-auto w-px bg-border", h)} />;
}

function Dot() {
  return (
    <div className="relative z-10 mx-auto size-1.5 shrink-0 rounded-full bg-foreground/25" />
  );
}

// ---------------------------------------------------------------------------
// Node components
// ---------------------------------------------------------------------------

function RootNode({ count }: { count: number }) {
  return (
    <div className="border-border bg-muted/50 rounded-md border px-5 py-1.5 text-center">
      <div className="text-foreground text-xs font-semibold">
        Your Representatives
      </div>
      <div className="text-muted-foreground text-[10px]">
        {count} elected officials
      </div>
    </div>
  );
}

/** Single official row: Name [D] · Title */
function OfficialRow({ official }: { official: OfficialInfo }) {
  const abbrev = abbreviateParty(official.party);
  const color = getPartyColor(official.party);
  const title = shortenTitle(official.title);

  return (
    <div className="flex min-w-0 items-baseline gap-1.5 py-[2px] text-[11px] leading-snug">
      <span className="text-foreground shrink-0 font-medium">
        {official.name}
      </span>
      {abbrev && (
        <span
          className="relative top-[-0.5px] shrink-0 rounded px-[3px] py-px text-[8px] font-bold leading-none text-white"
          style={{ backgroundColor: color }}
        >
          {abbrev}
        </span>
      )}
      <span className="text-muted-foreground/50 min-w-0 truncate text-[10px]">
        {title}
      </span>
    </div>
  );
}

/**
 * Full-width tier card with sub-groups as labeled sections inside.
 * Large groups (>6 officials) use a 2-column grid since the card
 * spans the full container width.
 */
function TierCard({ tier }: { tier: HierarchyTier }) {
  return (
    <div className="border-border w-full overflow-hidden rounded-lg border">
      {/* Tier header */}
      <div className="bg-muted/40 border-border border-b px-4 py-1.5 text-center">
        <span className="text-foreground text-xs font-semibold">
          {tier.label}
        </span>
        <span className="text-muted-foreground ml-2 text-[10px]">
          {tier.count} official{tier.count !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Sub-group sections */}
      <div className="divide-border divide-y">
        {tier.groups.map((group) => {
          const useGrid = group.officials.length > 6;
          return (
            <div key={group.label} className="px-3 py-2">
              {/* Sub-group label */}
              {tier.groups.length > 1 && (
                <div className="text-muted-foreground mb-1 text-[10px] font-semibold uppercase tracking-wide">
                  {group.label}
                </div>
              )}
              {/* Officials */}
              <div
                className={cn(
                  useGrid
                    ? "grid grid-cols-2 gap-x-4"
                    : "flex flex-col",
                )}
              >
                {group.officials.map((o) => (
                  <OfficialRow
                    key={`${o.name}-${o.title}`}
                    official={o}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface RepresentativesHierarchyProps {
  officials: OfficialInfo[];
  cityName: string | null;
}

export function RepresentativesHierarchy({
  officials,
  cityName,
}: RepresentativesHierarchyProps) {
  const stateName = officials.find((o) => o.state)?.state ?? null;
  const tiers = useMemo(
    () => buildHierarchy(officials, cityName, stateName),
    [officials, cityName, stateName],
  );

  if (officials.length === 0) {
    return (
      <div className="border-border rounded-lg border p-3">
        <div className="text-muted-foreground text-center text-sm">
          No representatives found for this location.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-0">
      {/* Root */}
      <RootNode count={officials.length} />

      {/* Tiers cascade vertically, connected by lines */}
      {tiers.map((tier) => (
        <div key={tier.id} className="flex w-full flex-col items-center">
          <VLine />
          <Dot />
          <VLine h="h-2" />
          <TierCard tier={tier} />
        </div>
      ))}
    </div>
  );
}
