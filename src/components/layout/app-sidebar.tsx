'use client'

import type { ReactNode } from 'react'
import { AppSidebar as SidebarNavigation } from '@/components/app-sidebar'
import Link from 'next/link'
import { resolveDefaultDashboardPath } from '@/lib/role-routing'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'

type SidebarProps = {
  userName?: string | null
  userEmail?: string | null
  roles: string[]
  children: ReactNode
}

export function AppSidebar({ userName, userEmail, roles, children }: SidebarProps) {
  const sectionTitle = roles.includes('SUPER_ADMIN')
    ? 'Administration'
    : roles.includes('AGENT')
      ? 'Agent'
      : roles.includes('CHEF_EQUIPE')
        ? "Chef d’équipe"
        : 'Client'

  return (
    <SidebarProvider>
      <SidebarNavigation userName={userName} userEmail={userEmail} roles={roles} />
      <SidebarInset className="app-font bg-[#080808]">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 bg-[#080808] px-4 text-zinc-100 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4 bg-white/10" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild className="text-zinc-400 hover:text-zinc-100">
                  <Link href={resolveDefaultDashboardPath(roles)}>Tableau de bord</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem className="text-zinc-100">
                <BreadcrumbPage>{sectionTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="app-font flex flex-1 flex-col gap-4 bg-[#080808] p-4 pt-0 text-zinc-100">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
