"use client"

import { useRouter } from "next/navigation"
import { useAdminAuthStore } from "@be-in-digital/admin"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@be-in-digital/ui"
import { LogOut, ChevronsUpDown, Settings } from "lucide-react"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@be-in-digital/admin"

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return email?.charAt(0).toUpperCase() ?? "?"
}

export function SidebarUserMenu() {
  const router = useRouter()
  const user = useAdminAuthStore((s) => s.user)
  const signOut = useAdminAuthStore((s) => s.signOut)

  const handleSignOut = async () => {
    if (signOut) {
      await signOut()
    }
    router.push("/sign-in")
  }

  if (!user) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
            >
              <Avatar size="sm">
                {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
                <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name ?? user.email}</span>
                {user.name && (
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            side="top"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{user.name ?? user.email}</p>
                {user.name && (
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
              <Settings className="mr-2 size-4" />
              Paramètres
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
