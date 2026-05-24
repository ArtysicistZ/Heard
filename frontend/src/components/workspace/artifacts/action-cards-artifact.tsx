"use client";

import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MailIcon,
  MapPinIcon,
  UserIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Official {
  name: string;
  title: string;
  jurisdiction?: string;
  party?: string;
  email?: string;
  office?: string;
  phone?: string;
  relevance?: string;
}

interface ActionCardsData {
  type: string;
  issue_summary: string;
  generated_message: {
    subject: string;
    body: string;
  };
  officials: Official[];
  metadata?: {
    address?: string;
    issue_category?: string;
    subcategory?: string;
    severity?: string;
    officials_count?: number;
    next_steps?: string[];
  };
}

const PARTY_COLORS: Record<string, string> = {
  Democrat: "#2563eb",
  Republican: "#dc2626",
  Independent: "#6b7280",
};

const JURISDICTION_LABELS: Record<string, string> = {
  municipal: "City",
  county: "County",
  state: "State",
  federal: "Federal",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

function parseActionCards(content: string): ActionCardsData | null {
  try {
    const parsed = JSON.parse(content) as ActionCardsData;
    if (!parsed.officials || !Array.isArray(parsed.officials)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function personalizeEmail(body: string, officialName: string): string {
  return body.replace(/\[Official Name\]/g, officialName);
}

function EmailDraft({
  subject,
  body,
  officialName,
}: {
  subject: string;
  body: string;
  officialName: string;
}) {
  const personalizedBody = personalizeEmail(body, officialName);

  return (
    <div className="border-border/50 mt-3 rounded-lg border">
      <div className="border-border/50 border-b px-4 py-2">
        <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          Email Preview
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-muted-foreground shrink-0 text-xs font-medium">
            Subject:
          </span>
          <span className="text-sm font-medium">{subject}</span>
        </div>
        <div className="bg-muted/30 rounded-md p-3">
          <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {personalizedBody}
          </pre>
        </div>
      </div>
    </div>
  );
}

function OfficialCard({
  official,
  messageSent,
  emailSubject,
  emailBody,
  onSend,
}: {
  official: Official;
  messageSent: boolean;
  emailSubject: string;
  emailBody: string;
  onSend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const partyColor = official.party ? PARTY_COLORS[official.party] : undefined;
  const jurisdictionLabel = official.jurisdiction
    ? (JURISDICTION_LABELS[official.jurisdiction] ?? official.jurisdiction)
    : undefined;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-lg border transition-all duration-300",
        messageSent
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-card hover:border-border/80",
      )}
      style={
        partyColor && !messageSent
          ? { borderLeftColor: partyColor, borderLeftWidth: "3px" }
          : undefined
      }
    >
      {/* Main card content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold">{official.name}</div>
              <div className="text-muted-foreground text-sm">
                {official.title}
              </div>
              {official.office && (
                <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                  <BuildingIcon className="size-3 shrink-0" />
                  <span>{official.office}</span>
                </div>
              )}
              {official.email && (
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs font-mono">
                  <MailIcon className="size-3 shrink-0" />
                  <span>{official.email}</span>
                </div>
              )}
              {official.phone && (
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs font-mono">
                  <MapPinIcon className="size-3 shrink-0" />
                  <span>{official.phone}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {jurisdictionLabel && (
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
                {jurisdictionLabel}
              </span>
            )}
            {official.party && (
              <span
                className="rounded-md px-2 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: partyColor ?? "#6b7280" }}
              >
                {official.party}
              </span>
            )}
          </div>
        </div>

        {official.relevance && (
          <div className="bg-muted/40 mt-3 rounded-md px-3 py-2 text-sm">
            <span className="text-muted-foreground font-medium">Why: </span>
            {official.relevance}
          </div>
        )}

        {/* Action row */}
        <div className="mt-3 flex items-center gap-2">
          <Button
            className={cn(
              "flex-1 transition-all duration-300",
              messageSent && "bg-emerald-600 text-white hover:bg-emerald-600",
            )}
            variant={messageSent ? "default" : "outline"}
            size="sm"
            disabled={messageSent}
            onClick={onSend}
          >
            {messageSent ? (
              <>
                <CheckIcon className="mr-1.5 size-4" />
                Email Sent
              </>
            ) : (
              <>
                <MailIcon className="mr-1.5 size-4" />
                Send Email
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground shrink-0"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
            <span className="ml-1 text-xs">
              {expanded ? "Hide" : "Preview"}
            </span>
          </Button>
        </div>
      </div>

      {/* Expandable email preview */}
      {expanded && (
        <div className="border-border/50 border-t px-4 pb-4">
          <EmailDraft
            subject={emailSubject}
            body={emailBody}
            officialName={official.name}
          />
        </div>
      )}
    </div>
  );
}

export function ActionCardsArtifact({ content }: { content: string }) {
  const data = useMemo(() => parseActionCards(content), [content]);
  const [sentOfficials, setSentOfficials] = useState<Set<number>>(new Set());
  const [showFullDraft, setShowFullDraft] = useState(false);

  const handleSend = useCallback((index: number) => {
    setSentOfficials((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);

  if (!data) {
    return (
      <div className="text-muted-foreground flex size-full items-center justify-center p-8">
        <p>Unable to load action cards data.</p>
      </div>
    );
  }

  const totalOfficials = data.officials.length;
  const sentCount = sentOfficials.size;

  return (
    <div className="flex size-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <h2 className="text-xl font-bold">Take Action</h2>
        {data.issue_summary && (
          <p className="text-muted-foreground mt-1 text-sm">
            {data.issue_summary}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {data.metadata?.address && (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono">
              <MapPinIcon className="size-3" />
              {data.metadata.address}
            </span>
          )}
          {data.metadata?.issue_category && (
            <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium">
              {data.metadata.issue_category}
              {data.metadata.subcategory
                ? ` / ${data.metadata.subcategory}`
                : ""}
            </span>
          )}
          {data.metadata?.severity && (
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-medium",
                SEVERITY_STYLES[data.metadata.severity] ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {data.metadata.severity.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Email draft section */}
      <div className="border-b px-6 py-3">
        <button
          className="flex w-full items-center justify-between text-left"
          onClick={() => setShowFullDraft(!showFullDraft)}
        >
          <div>
            <div className="text-sm font-medium">Email Draft</div>
            <div className="text-muted-foreground text-xs">
              {data.generated_message.subject}
            </div>
          </div>
          {showFullDraft ? (
            <ChevronUpIcon className="text-muted-foreground size-4" />
          ) : (
            <ChevronDownIcon className="text-muted-foreground size-4" />
          )}
        </button>
        {showFullDraft && (
          <div className="bg-muted/30 mt-3 rounded-md p-4">
            <div className="mb-2 text-xs font-medium">
              Subject: {data.generated_message.subject}
            </div>
            <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-xs leading-relaxed">
              {data.generated_message.body}
            </pre>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="border-b px-6 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {sentCount === 0
              ? "Send your message to officials below"
              : sentCount === totalOfficials
                ? "Your voice has been heard!"
                : `Your voice reached ${sentCount} of ${totalOfficials} officials`}
          </span>
          <span className="text-muted-foreground font-mono text-xs">
            {sentCount}/{totalOfficials}
          </span>
        </div>
        <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{
              width: `${totalOfficials > 0 ? (sentCount / totalOfficials) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Send All button */}
      {sentCount < totalOfficials && (
        <div className="border-b px-6 py-3">
          <Button
            className="w-full"
            onClick={() => {
              const allIndices = data.officials.map((_, i) => i);
              let delay = 0;
              for (const idx of allIndices) {
                if (!sentOfficials.has(idx)) {
                  setTimeout(() => handleSend(idx), delay);
                  delay += 300;
                }
              }
            }}
          >
            <MailIcon className="mr-2 size-4" />
            Send to All {totalOfficials} Officials
          </Button>
        </div>
      )}

      {/* Officials list */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="grid gap-3">
          {data.officials.map((official, index) => (
            <OfficialCard
              key={`${official.name}-${index}`}
              official={official}
              messageSent={sentOfficials.has(index)}
              emailSubject={data.generated_message.subject}
              emailBody={data.generated_message.body}
              onSend={() => handleSend(index)}
            />
          ))}
        </div>
      </div>

      {/* Success footer */}
      {sentCount === totalOfficials && totalOfficials > 0 && (
        <div className="border-t bg-emerald-500/5 px-6 py-5 text-center">
          <div className="text-lg font-bold text-emerald-400">
            Your voice reached {totalOfficials} official
            {totalOfficials !== 1 ? "s" : ""}
          </div>
          <div className="text-muted-foreground mt-1 text-sm">
            across{" "}
            {
              new Set(
                data.officials.map((o) => o.jurisdiction).filter(Boolean),
              ).size
            }{" "}
            levels of government
          </div>
        </div>
      )}
    </div>
  );
}
