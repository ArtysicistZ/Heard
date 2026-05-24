import { type Institution, type InstitutionStats, type ContactRecord, type ResolutionRecord } from "./types";

const BASE = "/api/civic";

export async function fetchInstitutions(category?: string): Promise<Institution[]> {
  const url = category ? `${BASE}/institutions?category=${category}` : `${BASE}/institutions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch institutions");
  const data = await res.json();
  return data.institutions;
}

export async function fetchInstitution(id: string): Promise<Institution> {
  const res = await fetch(`${BASE}/institutions/${id}`);
  if (!res.ok) throw new Error("Institution not found");
  return res.json();
}

export async function fetchAllStats(): Promise<InstitutionStats[]> {
  const res = await fetch(`${BASE}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  const data = await res.json();
  return data.stats;
}

export async function fetchContacts(institutionId?: string): Promise<ContactRecord[]> {
  const url = institutionId ? `${BASE}/contacts?institution_id=${institutionId}` : `${BASE}/contacts`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return data.contacts;
}

export async function createContact(data: {
  institutionId: string;
  issueCategory: string;
  summary: string;
  zipCode?: string;
}): Promise<ContactRecord> {
  const res = await fetch(`${BASE}/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      institution_id: data.institutionId,
      issue_category: data.issueCategory,
      summary: data.summary,
      zip_code: data.zipCode,
    }),
  });
  if (!res.ok) throw new Error("Failed to create contact");
  return res.json();
}

export async function createResolution(data: {
  contactId: string;
  institutionId: string;
  status: string;
  userComment?: string;
}): Promise<ResolutionRecord> {
  const res = await fetch(`${BASE}/resolutions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact_id: data.contactId,
      institution_id: data.institutionId,
      status: data.status,
      user_comment: data.userComment,
    }),
  });
  if (!res.ok) throw new Error("Failed to create resolution");
  return res.json();
}

export async function fetchDistricts(): Promise<GeoJSON.FeatureCollection> {
  const res = await fetch(`${BASE}/districts`);
  if (!res.ok) throw new Error("Failed to fetch districts");
  return res.json();
}
