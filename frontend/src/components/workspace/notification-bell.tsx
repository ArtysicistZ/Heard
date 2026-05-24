"use client";

import { BellIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { getBackendBaseURL } from "@/core/config";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  grievance_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const resp = await fetch(
        `${getBackendBaseURL()}/api/civic/notifications?user_id=${user.id}`,
      );
      if (!resp.ok) return;
      const data = await resp.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch {
      // Silently fail
    }
  }, [user]);

  // Poll every 30s
  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await fetch(
        `${getBackendBaseURL()}/api/civic/notifications/read-all?user_id=${user.id}`,
        { method: "POST" },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }, [user]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-foreground relative rounded-md p-1.5 transition-colors"
      >
        <BellIcon className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="bg-popover border-border absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border shadow-xl">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => void handleMarkAllRead()}
                >
                  Mark all read
                </Button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-xs">
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => {
                const inner = (
                  <div
                    key={n.id}
                    className={cn(
                      "border-b px-3 py-2.5 transition-colors last:border-b-0",
                      !n.is_read && "bg-blue-500/5",
                      n.grievance_id && "cursor-pointer hover:bg-muted/50",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-blue-500" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium leading-snug">
                          {n.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[10px] leading-snug">
                          {n.body}
                        </p>
                        <p className="text-muted-foreground mt-1 text-[10px]">
                          {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                );

                if (n.grievance_id) {
                  return (
                    <Link
                      key={n.id}
                      href={`/workspace/grievances/${n.grievance_id}`}
                      onClick={() => setOpen(false)}
                    >
                      {inner}
                    </Link>
                  );
                }
                return inner;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
