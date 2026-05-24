"use client";

import { CheckCircleIcon, ClockIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ISSUE_CATEGORIES } from "@/core/civic/constants";
import { useCreateResolution } from "@/core/civic/hooks";
import { type Institution } from "@/core/civic/types";
import { useI18n } from "@/core/i18n/hooks";

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  institution: Institution | null;
}

type ResolutionStatus = "resolved" | "in-progress" | "unresolved";

export function FollowUpDialog({
  open,
  onOpenChange,
  institution,
}: FollowUpDialogProps) {
  const { t } = useI18n();
  const createResolution = useCreateResolution();

  const [issueCategory, setIssueCategory] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ResolutionStatus | "">("");
  const [comment, setComment] = useState("");

  const issueCategoryTranslations: Record<string, string> = {
    "abandoned-vehicles": t.civicMap.issueCategories.abandonedVehicles,
    "illegal-dumping": t.civicMap.issueCategories.illegalDumping,
    infrastructure: t.civicMap.issueCategories.infrastructure,
    graffiti: t.civicMap.issueCategories.graffiti,
    housing: t.civicMap.issueCategories.housing,
    safety: t.civicMap.issueCategories.safety,
    "vacant-lots": t.civicMap.issueCategories.vacantLots,
    permits: t.civicMap.issueCategories.permits,
    utilities: t.civicMap.issueCategories.utilities,
    other: t.civicMap.issueCategories.other,
  };

  const handleSubmit = () => {
    if (!institution || !status || !issueCategory) return;

    createResolution.mutate(
      {
        contactId: `manual-${Date.now()}`,
        institutionId: institution.id,
        status,
        userComment: [description, comment].filter(Boolean).join(" — "),
      },
      {
        onSuccess: () => {
          toast.success(t.civicMap.resolutionReported);
          onOpenChange(false);
          // Reset form
          setIssueCategory("");
          setDescription("");
          setStatus("");
          setComment("");
        },
      },
    );
  };

  if (!institution) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.civicMap.reportFollowUp}</DialogTitle>
          <DialogDescription>
            {institution.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Institution (read-only) */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              {t.civicMap.institution}
            </label>
            <div className="bg-muted text-foreground rounded-lg px-3 py-2 text-sm">
              {institution.name}
            </div>
          </div>

          {/* Issue category */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              {t.civicMap.issueCategory}
            </label>
            <Select value={issueCategory} onValueChange={setIssueCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {issueCategoryTranslations[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brief description */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              {t.civicMap.briefDescription}
            </label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Resolution status */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              {t.civicMap.howResolved}
            </label>
            <div className="flex gap-2">
              <StatusButton
                active={status === "resolved"}
                onClick={() => setStatus("resolved")}
                icon={<CheckCircleIcon className="size-4 text-green-600" />}
                label={t.civicMap.resolved}
              />
              <StatusButton
                active={status === "in-progress"}
                onClick={() => setStatus("in-progress")}
                icon={<ClockIcon className="size-4 text-amber-500" />}
                label={t.civicMap.inProgress}
              />
              <StatusButton
                active={status === "unresolved"}
                onClick={() => setStatus("unresolved")}
                icon={<XCircleIcon className="size-4 text-red-500" />}
                label={t.civicMap.unresolved}
              />
            </div>
          </div>

          {/* Additional comments */}
          <div>
            <label className="text-foreground mb-1.5 block text-sm font-medium">
              {t.civicMap.additionalComments}
            </label>
            <Textarea
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!status || !issueCategory || createResolution.isPending}
          >
            {t.civicMap.submitReport}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-border flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent border-foreground/20 font-medium"
          : "hover:bg-accent/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
