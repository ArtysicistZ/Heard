export type InstitutionCategory =
  | "city-government"
  | "city-council"
  | "us-congress"
  | "pa-state-senate"
  | "pa-state-house"
  | "education"
  | "police"
  | "community";

export interface Institution {
  id: string;
  name: string;
  category: InstitutionCategory;
  address: string;
  phone: string;
  coordinates: [number, number]; // [lng, lat]
  description?: string;
  website?: string;
  officeholder?: string;
  district?: string;
}

export interface ContactRecord {
  id: string;
  institutionId: string;
  issueCategory: string;
  summary: string;
  createdAt: string;
  zipCode?: string;
}

export interface ResolutionRecord {
  id: string;
  contactId: string;
  institutionId: string;
  status: "pending" | "in-progress" | "resolved" | "unresolved";
  reportedAt: string;
  resolvedAt?: string;
  userComment?: string;
}

export interface InstitutionStats {
  institutionId: string;
  totalContacts: number;
  contactsLast30Days: number;
  resolvedCount: number;
  unresolvedCount: number;
  pendingCount: number;
  resolutionRate: number;
  topIssueCategories: { category: string; count: number }[];
}

export type MapViewMode = "voter" | "candidate";
