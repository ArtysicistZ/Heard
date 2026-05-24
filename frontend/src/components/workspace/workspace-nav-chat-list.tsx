"use client";

import {
  ActivityIcon,
  BotIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useI18n } from "@/core/i18n/hooks";

export function WorkspaceNavChatList() {
  const { t } = useI18n();
  const pathname = usePathname();
  const { user } = useAuth();
  const isCandidate = user?.userType === "candidate";
  return (
    <SidebarGroup className="pt-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive={pathname === "/workspace/chats"} asChild>
            <Link className="text-muted-foreground" href="/workspace/chats">
              <MessagesSquare />
              <span>{t.sidebar.chats}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.startsWith("/workspace/agents")}
            asChild
          >
            <Link className="text-muted-foreground" href="/workspace/agents">
              <BotIcon />
              <span>{t.sidebar.agents}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={
              pathname.startsWith("/workspace/community") ||
              pathname.startsWith("/workspace/map") ||
              pathname.startsWith("/workspace/grievances")
            }
            asChild
          >
            <Link
              className="text-muted-foreground"
              href="/workspace/community"
            >
              <MegaphoneIcon />
              <span>Community</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {user && (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/workspace/activity")}
              asChild
            >
              <Link
                className="text-muted-foreground"
                href="/workspace/activity"
              >
                <ActivityIcon />
                <span>My Activity</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {isCandidate && (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.startsWith("/dashboard")}
              asChild
            >
              <Link className="text-muted-foreground" href="/dashboard">
                <LayoutDashboardIcon />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
