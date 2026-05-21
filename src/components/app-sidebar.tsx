"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboardIcon, ShieldCheckIcon, UsersIcon, Building2Icon, ActivityIcon, TerminalIcon, SquarePenIcon } from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  userName?: string | null
  userEmail?: string | null
  roles?: string[]
}

const ALL_APP_ROLES = ["SUPER_ADMIN", "PATRON", "AGENT", "CHEF_EQUIPE", "CLIENT"]

function hasAccess(userRoles: string[], allowedRoles: string[]): boolean {
  return userRoles.some((role) => allowedRoles.includes(role))
}

function initials(name?: string | null): string {
  if (!name) return "U"
  const chunks = name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
  return (chunks[0]?.[0] ?? "U") + (chunks[1]?.[0] ?? "")
}

function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: "Super admin",
    PATRON: "Patron",
    AGENT: "Agent",
    CHEF_EQUIPE: "Chef d’équipe",
    CLIENT: "Client",
  }
  return labels[role] ?? role
}

const NAV_MAIN = [
  {
    title: "Administration",
    url: "/admin",
    icon: <ShieldCheckIcon />,
    allowedRoles: ["SUPER_ADMIN"],
    items: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
      },
      {
        title: "Analytics",
        url: "/admin/analytics",
      },
      {
        title: "Opérations",
        url: "/admin/operations",
      },
      {
        title: "Onboarding",
        url: "/onboarding",
      },
      {
        title: "Hôpitaux",
        url: "/admin/analytics/tenants",
      },
      {
        title: "Quotas",
        url: "/admin/analytics/quotas",
      },
      {
        title: "Fonctions",
        url: "/admin/analytics/features",
      },
    ],
  },
  {
    title: "Patron",
    url: "/patron",
    icon: <ShieldCheckIcon />,
    allowedRoles: ["PATRON", "SUPER_ADMIN"],
    items: [
      {
        title: "Pilotage",
        url: "/patron",
      },
      {
        title: "Sites",
        url: "/patron/hopitaux",
      },
      {
        title: "Agents",
        url: "/patron/personnel",
      },
      {
        title: "Entrées",
        url: "/patron/entrees",
      },
    ],
  },
  {
    title: "Agent",
    url: "/agent",
    icon: <LayoutDashboardIcon />,
    allowedRoles: ["AGENT", "SUPER_ADMIN"],
    items: [
      {
        title: "Dashboard agent",
        url: "/agent/dashboard",
      },
      {
        title: "Créer une entrée",
        url: "/agent/entries/new",
      },
    ],
  },
  {
    title: "Chef d’équipe",
    url: "/chef",
    icon: <UsersIcon />,
    allowedRoles: ["CHEF_EQUIPE", "PATRON", "SUPER_ADMIN"],
    items: [
      {
        title: "Dashboard chef",
        url: "/chef/dashboard",
      },
      {
        title: "Analytics",
        url: "/chef/analytics",
      },
      {
        title: "Activité",
        url: "/chef/analytics/activity",
      },
      {
        title: "Alertes",
        url: "/chef/analytics/alerts",
      },
    ],
  },
  {
    title: "Client",
    url: "/client",
    icon: <Building2Icon />,
    allowedRoles: ["CLIENT", "PATRON", "SUPER_ADMIN"],
    items: [
      {
        title: "Dashboard client",
        url: "/client/dashboard",
      },
      {
        title: "Analytics",
        url: "/client/analytics",
      },
      {
        title: "Entrées",
        url: "/client/analytics/entries",
      },
      {
        title: "Sites",
        url: "/client/analytics/sites",
      },
      {
        title: "Agents",
        url: "/client/analytics/agents",
      },
      {
        title: "Tendances",
        url: "/client/analytics/trends",
      },
      {
        title: "Exports",
        url: "/client/analytics/exports",
      },
    ],
  },
] as const

const NAV_SECONDARY = [
  {
    title: "Créer une entrée",
    url: "/agent/entries/new",
    icon: <SquarePenIcon />,
    allowedRoles: ["AGENT", "SUPER_ADMIN"],
  },
  {
    title: "Statut",
    url: "/status",
    icon: <ActivityIcon />,
    allowedRoles: ALL_APP_ROLES,
  },
]

export function AppSidebar({ userName, userEmail, roles, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const currentPath = pathname ?? ''
  const safeRoles = roles ?? []
  const isSuperAdmin = safeRoles.includes('SUPER_ADMIN')
  const isPatronUser = safeRoles.includes('PATRON')
  const isPatronOnly = safeRoles.includes('PATRON') && safeRoles.length === 1
  const isPatronRoute = currentPath === '/patron' || currentPath.startsWith('/patron/') || currentPath.includes('/patron')
  const isPatronNavigationOnly = !isSuperAdmin && isPatronRoute

  const normalizeUrl = (url: string) => {
    if (!isSuperAdmin) return url
    if (url === '/agent/dashboard') return '/agent'
    if (url === '/chef/dashboard') return '/chef'
    if (url === '/client/dashboard') return '/client'
    return url
  }

  const patronSimpleNav = [
    {
      title: "Pilotage",
      url: "/patron",
      icon: <LayoutDashboardIcon />,
      isActive: false,
      items: [],
    },
    {
      title: "Sites",
      url: "/patron/hopitaux",
      icon: <Building2Icon />,
      isActive: false,
      items: [],
    },
    {
      title: "Agents",
      url: "/patron/personnel",
      icon: <UsersIcon />,
      isActive: false,
      items: [],
    },
    {
      title: "Entrées",
      url: "/patron/entrees",
      icon: <SquarePenIcon />,
      isActive: false,
      items: [],
    },
  ]

  const navMain = isPatronNavigationOnly
    ? patronSimpleNav
    : NAV_MAIN.filter((item) => hasAccess(safeRoles, [...item.allowedRoles])).map((item) => ({
        title: item.title,
        url: normalizeUrl(item.url),
        icon: item.icon,
        isActive: false,
        items: item.items.map((subItem) => ({
          title: subItem.title,
          url: normalizeUrl(subItem.url),
        })),
      }))

  const navSecondary = (isPatronNavigationOnly ? [] : NAV_SECONDARY).filter((item) => hasAccess(safeRoles, [...item.allowedRoles])).map((item) => ({
    title: item.title,
    url: item.url,
    icon: item.icon,
  }))

  const visibleRoleLabels = isPatronNavigationOnly
    ? ['Patron']
    : safeRoles.filter((role) => ALL_APP_ROLES.includes(role)).map(roleLabel)

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="sidebar-font border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.14),transparent_45%),linear-gradient(180deg,#0e1011_0%,#0a0c0d_100%)] text-zinc-100"
      {...props}
    >
      <SidebarHeader className="gap-3 px-3 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="h-auto rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-white/[0.08] hover:text-inherit">
              <Link href="/" className="gap-3">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.12)]">
                  <TerminalIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight font-mono">
                  <span className="truncate font-semibold tracking-[-0.02em] text-zinc-100">Main Courante</span>
                  <span className="truncate text-xs text-zinc-400">Pilotage sécurité incendie</span>
                </div>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-100">
                  {isPatronNavigationOnly || isPatronOnly ? 'Patron' : 'Console'}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator className="mx-3 my-2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <SidebarContent>
        <NavMain items={navMain} />
        {navSecondary.length ? <NavSecondary items={navSecondary} className="mt-auto px-1 pb-1" /> : null}
      </SidebarContent>
      <SidebarSeparator className="mx-3 my-2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <SidebarFooter>
        <NavUser
          user={{
            name: userName ?? "Utilisateur",
            email: userEmail ?? "",
            avatar: "",
            fallback: initials(userName),
            roles: visibleRoleLabels,
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
