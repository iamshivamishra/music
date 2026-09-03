"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  LogOut, PanelLeftClose, PanelLeftOpen, Home, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/navigation";
import { getDashboardNav } from "@/lib/dashboard-nav";
import ThemeToggle from "@/components/ThemeToggle";

function usePersistedSection(key: string, defaultOpen = true) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored !== null) setOpen(stored === "1");
  }, [key]);
  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(key, next ? "1" : "0");
      return next;
    });
  }, [key]);
  return [open, toggle] as const;
}

function UserAvatar({ session, size = 36 }: { session: Session; size?: number }) {
  const initials = (session.user.name || session.user.email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (session.user.image) {
    return (
      <Image
        src={session.user.image}
        alt={session.user.name || "Avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export interface NavLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
}

interface SidebarNavProps {
  session: Session;
  collapsed: boolean;
  toggleCollapsed: () => void;
}

export function SidebarNav({ session, collapsed, toggleCollapsed }: SidebarNavProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [workspaceOpen, toggleWorkspace] = usePersistedSection("dashboard.nav.workspace");
  const [libraryOpen, toggleLibrary] = usePersistedSection("dashboard.nav.library");
  const [accountOpen, toggleAccount] = usePersistedSection("dashboard.nav.account");

  const roleLabel =
    session.user.role === "admin"
      ? "Admin"
      : session.user.role === "producer"
        ? "Producer"
        : "Buyer";

  const { workspace: workspaceLinks, library: libraryLinks, account: accountLinks } =
    getDashboardNav(session.user.role);

  const navHrefs = [
    ...workspaceLinks.map((link) => link.href),
    ...libraryLinks.map((link) => link.href),
    ...accountLinks.map((link) => link.href),
  ];

  const isActive = (href: string) => isNavActive(pathname, href, navHrefs);

  const sidebarLinkClass = (href: string) =>
    cn(
      "group relative flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all duration-150",
      isActive(href)
        ? "bg-primary/12 text-sidebar-foreground"
        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      collapsed && "justify-center px-2.5"
    );

  const renderSectionHeader = (label: string, isOpen: boolean, onToggle: () => void) => {
    if (collapsed) return null;
    return (
      <button
        onClick={onToggle}
        className="mb-2 flex w-full items-center justify-between px-2 text-[11px] font-medium uppercase tracking-[0.15em] text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
      >
        {label}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
    );
  };

  const renderLinks = (
    links: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>,
    isOpen: boolean
  ) => {
    if (!isOpen && !collapsed) return null;
    return (
      <nav className="space-y-1.5">
        {links.map((link) => (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            title={collapsed ? link.label : undefined}
            className={sidebarLinkClass(link.href)}
          >
            {isActive(link.href) && (
              <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary" />
            )}
            <span className={cn("flex items-center", collapsed ? "" : "gap-2.5")}>
              <link.icon className={cn("h-4 w-4", isActive(link.href) ? "text-primary" : "")} />
              {!collapsed && <span className="font-medium">{link.label}</span>}
            </span>
          </Link>
        ))}
      </nav>
    );
  };

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen overflow-hidden border-r border-sidebar-border bg-sidebar p-4 transition-all duration-200 lg:flex lg:flex-col",
        collapsed ? "w-20" : "w-72"
      )}
    >
      <div className="flex h-full flex-col rounded-3xl border border-sidebar-border bg-sidebar-accent/30 p-3 shadow-sm ring-1 ring-white/[0.03]">
        <div
          className={cn(
            "mb-4 rounded-2xl border border-sidebar-border bg-sidebar-accent/40 shadow-sm",
            collapsed ? "p-2.5" : "p-4"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20">
              <Image
                src="/icon.svg"
                alt="Trishul Beats logo"
                width={22}
                height={22}
                className="h-[22px] w-[22px]"
                priority
              />
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold leading-none text-sidebar-foreground">Trishul Studio</p>
                <p className="mt-1 text-xs text-sidebar-foreground/60">Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Home link */}
        <div className="mb-4">
          <Link
            href="/"
            title={collapsed ? "Home" : undefined}
            className={cn(
              "flex items-center rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 transition-all duration-150 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              collapsed && "justify-center px-2.5"
            )}
          >
            <Home className="h-4 w-4" />
            {!collapsed && <span className="ml-2.5 font-medium">Home</span>}
          </Link>
        </div>

        {/* Workspace section */}
        {workspaceLinks.length > 0 && (
          <div className="mb-4">
            {renderSectionHeader("Studio", workspaceOpen, toggleWorkspace)}
            {renderLinks(workspaceLinks, workspaceOpen)}
          </div>
        )}

        {/* Library section */}
        <div className="mb-4">
          {renderSectionHeader("My Library", libraryOpen, toggleLibrary)}
          {renderLinks(libraryLinks, libraryOpen)}
        </div>

        <div className="mt-auto space-y-4">
          {/* Account section */}
          <div>
            {renderSectionHeader("Account", accountOpen, toggleAccount)}
            {renderLinks(accountLinks, accountOpen)}

            {/* Profile card */}
            {!collapsed && (
              <Link href="/profile" className="block">
                <div className="mt-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3.5 transition-colors hover:bg-sidebar-accent/50">
                  <div className="flex items-center gap-3">
                    <UserAvatar session={session} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-sidebar-foreground">{session.user.name}</p>
                      <p className="truncate text-xs text-sidebar-foreground/60">{session.user.email}</p>
                    </div>
                  </div>
                  <span className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {roleLabel}
                  </span>
                </div>
              </Link>
            )}
            {collapsed && (
              <Link
                href="/profile"
                title="Profile"
                className="mt-2 flex justify-center"
              >
                <UserAvatar session={session} size={28} />
              </Link>
            )}
          </div>

          <div
            className={cn(
              "rounded-xl border border-sidebar-border bg-sidebar-accent/30",
              collapsed ? "p-2" : "p-3"
            )}
          >
            <div className={cn("mb-2 flex items-center", collapsed ? "justify-center" : "justify-between")}>
              {!collapsed && (
                <p className="text-xs font-medium text-sidebar-foreground/60">
                  {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
                </p>
              )}
              <ThemeToggle className="h-7 w-7" />
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn("w-full", collapsed ? "justify-center px-0" : "justify-start")}
              onClick={() => signOut({ callbackUrl: "/" })}
              title={collapsed ? "Sign out" : undefined}
            >
              <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
              {!collapsed && "Sign out"}
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export { UserAvatar };
export type { NavLink as SidebarLink };
