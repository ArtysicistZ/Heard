"use client";

import {
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  GlobeIcon,
  Loader2Icon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  ShareIcon,
  UserIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { urlOfArtifact } from "@/core/artifacts/utils";
import { getBackendBaseURL } from "@/core/config";
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
  };
}

const PARTY_COLORS: Record<string, string> = {
  Democrat: "#2563eb",
  Republican: "#dc2626",
  Independent: "#6b7280",
};

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-emerald-500/10 text-emerald-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

function personalizeEmail(body: string, officialName: string): string {
  return body.replace(/\[Official Name\]/g, officialName);
}

function InlineOfficialCard({
  official,
  messageSent,
  sending,
  emailSubject,
  emailBody,
  onSend,
}: {
  official: Official;
  messageSent: boolean;
  sending: boolean;
  emailSubject: string;
  emailBody: string;
  onSend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const partyColor = official.party ? PARTY_COLORS[official.party] : undefined;

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
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="text-muted-foreground size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{official.name}</div>
              <div className="text-muted-foreground text-xs">
                {official.title}
              </div>
              {official.office && (
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
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
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {official.party && (
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: partyColor ?? "#6b7280" }}
              >
                {official.party}
              </span>
            )}
          </div>
        </div>

        {official.relevance && (
          <div className="bg-muted/40 mt-2 rounded-md px-2.5 py-1.5 text-xs">
            <span className="text-muted-foreground font-medium">Why: </span>
            {official.relevance}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <Button
            className={cn(
              "flex-1 text-xs transition-all duration-300",
              messageSent && "bg-emerald-600 text-white hover:bg-emerald-600",
            )}
            variant={messageSent ? "default" : "outline"}
            size="sm"
            disabled={messageSent || sending}
            onClick={onSend}
          >
            {sending ? (
              <>
                <Loader2Icon className="mr-1 size-3 animate-spin" />
                Sending...
              </>
            ) : messageSent ? (
              <>
                <CheckIcon className="mr-1 size-3" />
                Sent
              </>
            ) : (
              <>
                <MailIcon className="mr-1 size-3" />
                Send Now
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground shrink-0 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUpIcon className="size-3" />
            ) : (
              <ChevronDownIcon className="size-3" />
            )}
            <span className="ml-1">{expanded ? "Hide" : "Preview"}</span>
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-border/50 border-t px-3 pb-3">
          <div className="border-border/50 mt-2 rounded-lg border">
            <div className="border-border/50 border-b px-3 py-1.5">
              <div className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                Email Preview
              </div>
            </div>
            <div className="px-3 py-2">
              <div className="mb-1.5 flex items-baseline gap-1.5">
                <span className="text-muted-foreground shrink-0 text-[10px] font-medium">
                  Subject:
                </span>
                <span className="text-xs font-medium">{emailSubject}</span>
              </div>
              <div className="bg-muted/30 rounded-md p-2">
                <pre className="text-muted-foreground whitespace-pre-wrap font-sans text-[10px] leading-relaxed">
                  {personalizeEmail(emailBody, official.name)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActionCardsInline({
  threadId,
  actionCardsPath,
}: {
  threadId: string;
  actionCardsPath: string;
}) {
  const [data, setData] = useState<ActionCardsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sentOfficials, setSentOfficials] = useState<Set<number>>(new Set());
  const [sendingOfficials, setSendingOfficials] = useState<Set<number>>(
    new Set(),
  );
  const [isPublic, setIsPublic] = useState(true);
  const { user } = useAuth();

  // Fetch action cards content from artifact URL
  useEffect(() => {
    const url = urlOfArtifact({ filepath: actionCardsPath, threadId });
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        try {
          const parsed = JSON.parse(text) as ActionCardsData;
          if (parsed.officials && Array.isArray(parsed.officials)) {
            setData(parsed);
          }
        } catch {
          // Not valid JSON, skip
        }
      })
      .catch(() => {
        // Failed to fetch, skip
      })
      .finally(() => setLoading(false));
  }, [threadId, actionCardsPath]);

  const handleSend = useCallback(
    async (index: number) => {
      if (!user) {
        toast.error("Please sign in to send messages to officials");
        return;
      }

      setSendingOfficials((prev) => new Set(prev).add(index));

      try {
        const official = data?.officials[index];
        if (!official || !data) return;

        const resp = await fetch(`${getBackendBaseURL()}/api/civic/send-action`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender_id: user.id,
            thread_id: threadId,
            issue_summary: data.issue_summary,
            issue_category: data.metadata?.issue_category,
            severity: data.metadata?.severity,
            recipient_name: official.name,
            recipient_email: official.email,
            recipient_title: official.title,
            jurisdiction: official.jurisdiction,
            email_subject: data.generated_message.subject,
            email_body: personalizeEmail(
              data.generated_message.body,
              official.name,
            ),
            card_data: official,
            is_public: isPublic,
          }),
        });

        if (resp.ok) {
          setSentOfficials((prev) => new Set(prev).add(index));
          toast.success(`Message recorded for ${official.name}`);
        } else {
          toast.error("Failed to send — please try again");
        }
      } catch {
        toast.error("Failed to send — please try again");
      } finally {
        setSendingOfficials((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [data, threadId, user, isPublic],
  );

  const totalOfficials = data?.officials.length ?? 0;
  const sentCount = sentOfficials.size;

  const handleSendAll = useCallback(() => {
    if (!data) return;
    let delay = 0;
    for (let i = 0; i < data.officials.length; i++) {
      if (!sentOfficials.has(i)) {
        const idx = i;
        setTimeout(() => void handleSend(idx), delay);
        delay += 400;
      }
    }
  }, [data, sentOfficials, handleSend]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Loading action cards...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="border-border mt-4 w-full overflow-hidden rounded-xl border shadow-lg">
      {/* Header */}
      <div className="bg-card border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-blue-500/10">
            <MailIcon className="size-3.5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-base font-bold">Take Action</h3>
            <p className="text-muted-foreground text-[10px]">One click to contact your representatives</p>
          </div>
        </div>
        {data.issue_summary && (
          <p className="text-muted-foreground mt-2 text-xs">
            {data.issue_summary}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {data.metadata?.address && (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono">
              <MapPinIcon className="size-2.5" />
              {data.metadata.address}
            </span>
          )}
          {data.metadata?.issue_category && (
            <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
              {data.metadata.issue_category}
            </span>
          )}
          {data.metadata?.severity && (
            <span
              className={cn(
                "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                SEVERITY_STYLES[data.metadata.severity] ??
                  "bg-muted text-muted-foreground",
              )}
            >
              {data.metadata.severity.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Community sharing toggle */}
      <div className="bg-card border-b px-4 py-2">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isPublic ? (
              <GlobeIcon className="text-muted-foreground size-3.5" />
            ) : (
              <LockIcon className="text-muted-foreground size-3.5" />
            )}
            <div>
              <div className="text-xs font-medium">
                Share with your community
              </div>
              <div className="text-muted-foreground text-[10px]">
                {isPublic
                  ? "Others can see and follow your grievance on the map"
                  : "Your grievance will be private"}
              </div>
            </div>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
      </div>

      {/* Progress */}
      <div className="bg-card border-b px-4 py-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">
            {sentCount === 0
              ? `Ready to contact ${totalOfficials} officials`
              : sentCount === totalOfficials
                ? "All officials contacted"
                : `${sentCount} of ${totalOfficials} officials contacted`}
          </span>
          <span className="text-muted-foreground font-mono">
            {sentCount}/{totalOfficials}
          </span>
        </div>
        <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{
              width: `${totalOfficials > 0 ? (sentCount / totalOfficials) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Send All */}
      {sentCount < totalOfficials && (
        <div className="bg-card border-b px-4 py-2">
          <Button
            className="w-full text-xs"
            size="sm"
            onClick={handleSendAll}
          >
            <MailIcon className="mr-1.5 size-3" />
            Send to All {totalOfficials} Officials
          </Button>
        </div>
      )}

      {/* Officials */}
      <div className="bg-card/50 flex flex-col gap-2 px-4 py-3">
        {data.officials.map((official, index) => (
          <InlineOfficialCard
            key={`${official.name}-${index}`}
            official={official}
            messageSent={sentOfficials.has(index)}
            sending={sendingOfficials.has(index)}
            emailSubject={data.generated_message.subject}
            emailBody={data.generated_message.body}
            onSend={() => void handleSend(index)}
          />
        ))}
      </div>

      {/* Success footer */}
      {sentCount === totalOfficials && totalOfficials > 0 && (
        <div className="border-t bg-emerald-500/5 px-4 py-5 text-center">
          <div className="text-base font-bold text-emerald-400">
            You just made democracy work.
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {totalOfficials} official{totalOfficials !== 1 ? "s" : ""} notified — your grievance is now on record
          </div>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-4 py-2 text-xs font-medium text-blue-500 transition-colors hover:bg-blue-500/20"
            onClick={async () => {
              const url = window.location.href;
              const text = `I just contacted ${totalOfficials} official${totalOfficials !== 1 ? "s" : ""} about a civic issue on Heard. Make your voice heard too!`;
              if (navigator.share) {
                try {
                  await navigator.share({ title: "Heard - Civic Action", text, url });
                } catch { /* cancelled */ }
              } else {
                await navigator.clipboard.writeText(`${text} ${url}`);
                toast.success("Link copied to clipboard");
              }
            }}
          >
            <ShareIcon className="size-3.5" />
            Spread the word
          </button>
        </div>
      )}
    </div>
  );
}