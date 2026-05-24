"use client";

import { LogInIcon, LogOutIcon, UserIcon } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useAuth } from "./auth-provider";

export function UserButton() {
  const { user, isLoading, signOut } = useAuth();
  const { open: isSidebarOpen } = useSidebar();

  if (isLoading) {
    return null;
  }

  if (!user) {
    return (
      <SidebarMenu className="w-full">
        <SidebarMenuItem>
          <Link href="/auth/login">
            <SidebarMenuButton size="lg">
              {isSidebarOpen ? (
                <div className="text-muted-foreground flex w-full items-center gap-2 text-sm">
                  <LogInIcon className="size-4" />
                  <span>Sign In</span>
                </div>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <LogInIcon className="text-muted-foreground size-4" />
                </div>
              )}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SidebarMenu className="w-full">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              {isSidebarOpen ? (
                <div className="flex w-full items-center gap-2">
                  <Avatar className="size-6">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-tight">
                      {user.name}
                    </span>
                    <span className="text-muted-foreground text-xs leading-tight">
                      {user.email}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Avatar className="size-5">
                    <AvatarImage src={user.image ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-48 rounded-lg"
            align="end"
            sideOffset={4}
          >
            <div className="px-2 py-1.5">
              <div className="text-sm font-medium">{user.name}</div>
              <div className="text-muted-foreground text-xs">{user.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                void signOut();
              }}
            >
              <LogOutIcon className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
