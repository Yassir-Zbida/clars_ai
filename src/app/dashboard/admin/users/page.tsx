"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import {
  type AdminUserProfile,
  useAdminUsers,
} from "../use-admin-users"

const PAGE_SIZE = 10

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const queryClient = useQueryClient()
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [status, setStatus] = React.useState<"all" | "active" | "deleted">("all")
  const [page, setPage] = React.useState(1)

  const [profileUserId, setProfileUserId] = React.useState<string | null>(null)
  const [deleteUserId, setDeleteUserId] = React.useState<{ id: string; name: string; email: string } | null>(null)

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  React.useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const { data: list, isLoading, isError } = useAdminUsers({
    search: debouncedSearch,
    status,
    page,
    limit: PAGE_SIZE,
  })

  const { data: profile, isPending: profileLoading, isError: profileError } = useQuery({
    queryKey: ["admin", "user", profileUserId],
    enabled: Boolean(profileUserId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${profileUserId}`, { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error("profile")
      const json = (await res.json()) as { data: AdminUserProfile }
      return json.data
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "DEACTIVATE" | "ACTIVATE" }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? "Failed to update user")
      }
    },
    onSuccess: async (_, { action }) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "user"] })
      toast.success(action === "DEACTIVATE" ? "User deactivated." : "User activated.")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error ?? "Failed to delete user")
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] })
      await queryClient.invalidateQueries({ queryKey: ["admin", "user"] })
      toast.success("User and workspace data removed.")
    },
  })

  const users = list?.data ?? []
  const total = list?.total ?? 0
  const totalPages = list?.totalPages ?? 1

  return (
    <Card className="border border-input bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Manage users</CardTitle>
          <CardDescription className="text-xs">
            Deactivate blocks sign-in but keeps data. Delete permanently removes the user and all CRM data they own.
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <i className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              className="h-9 py-0 pl-8 pr-2.5 text-xs leading-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="user-status" className="sr-only">
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger
                id="user-status"
                className="h-9 min-h-9 w-full shrink-0 px-2.5 py-0 text-xs leading-none data-[size=default]:h-9"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="deleted">Deactivated only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Loading users…
                </TableCell>
              </TableRow>
            )}
            {isError && !isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-destructive">
                  Failed to load users.
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No users match your filters.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium leading-none">{user.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      user.status === "ACTIVE" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                      user.status === "SOFT_DELETED" &&
                        "bg-amber-500/10 text-amber-800 dark:text-amber-400"
                    )}
                  >
                    {user.status === "SOFT_DELETED" ? "Deactivated" : "Active"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setProfileUserId(user.id)}
                    >
                      View profile
                    </Button>
                    {user.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        title={user.id === currentUserId ? "You cannot deactivate your own account." : undefined}
                        disabled={
                          toggleActiveMutation.isPending ||
                          deleteMutation.isPending ||
                          user.id === currentUserId
                        }
                        onClick={() =>
                          toggleActiveMutation.mutate(
                            { id: user.id, action: "DEACTIVATE" },
                            {
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to deactivate"),
                            }
                          )
                        }
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        disabled={toggleActiveMutation.isPending || deleteMutation.isPending}
                        onClick={() =>
                          toggleActiveMutation.mutate(
                            { id: user.id, action: "ACTIVATE" },
                            {
                              onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to activate"),
                            }
                          )
                        }
                      >
                        Activate
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={deleteMutation.isPending || toggleActiveMutation.isPending}
                      onClick={() => setDeleteUserId({ id: user.id, name: user.name, email: user.email })}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!isLoading && !isError && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-input pt-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {total.toLocaleString()} user{total !== 1 ? "s" : ""} · Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog
        open={Boolean(profileUserId)}
        onOpenChange={(open) => {
          if (!open) setProfileUserId(null)
        }}
      >
        <DialogContent className="max-h-[min(90vh,42rem)] w-[min(96vw,32rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User profile</DialogTitle>
            <DialogDescription className="text-xs">General account and workspace settings (read-only).</DialogDescription>
          </DialogHeader>
          {profileLoading && profileUserId && (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading profile…</p>
          )}
          {profileError && profileUserId && (
            <p className="py-8 text-center text-sm text-destructive">Could not load this profile.</p>
          )}
          {profile && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 rounded-xl border border-input bg-muted/20 p-3 text-xs">
                <ProfileRow label="Name" value={profile.name ?? "—"} />
                <ProfileRow label="Email" value={profile.email ?? "—"} />
                <ProfileRow label="Status" value={profile.status === "ARCHIVED" ? "Deactivated" : "Active"} />
                <ProfileRow label="Email verified" value={profile.emailVerified ? new Date(profile.emailVerified).toLocaleString() : "—"} />
                <ProfileRow label="2FA (OTP)" value={profile.otpEnabled ? "Enabled" : "Off"} />
                <ProfileRow label="Member since" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString() : "—"} />
                <ProfileRow label="Last updated" value={profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "—"} />
                <ProfileRow label="Survey completed" value={profile.onboardingSurveyCompletedAt ? new Date(profile.onboardingSurveyCompletedAt).toLocaleString() : "—"} />
                <ProfileRow label="Default currency" value={profile.defaultCurrency ?? "—"} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company / invoicing</p>
                <div className="mt-2 grid gap-2 rounded-xl border border-input bg-muted/20 p-3 text-xs">
                  <ProfileRow label="Company" value={profile.companyName ?? "—"} />
                  <ProfileRow label="Tagline" value={profile.companyTagline ?? "—"} />
                  <ProfileRow label="Address" value={profile.companyAddress ?? "—"} />
                  <ProfileRow label="Phone" value={profile.companyPhone ?? "—"} />
                  <ProfileRow label="Billing email" value={profile.companyEmail ?? "—"} />
                  <ProfileRow label="Website" value={profile.companyWebsite ?? "—"} />
                  <ProfileRow label="Tax ID" value={profile.taxId ?? "—"} />
                  <ProfileRow label="Invoice accent" value={profile.invoiceColor ?? "—"} />
                  <ProfileRow label="Logo uploaded" value={profile.hasLogo ? "Yes" : "No"} />
                  <ProfileRow label="Signature image" value={profile.hasSignatureImage ? "Yes" : "No"} />
                  <ProfileRow label="Signature text" value={profile.signatureText ?? "—"} />
                  <ProfileRow label="Payment info" value={profile.paymentInfo ? `${profile.paymentInfo.slice(0, 120)}${profile.paymentInfo.length > 120 ? "…" : ""}` : "—"} />
                </div>
              </div>
              {profile.onboardingSurvey != null && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Onboarding survey</p>
                  <pre className="mt-2 max-h-48 overflow-auto rounded-lg border border-input bg-card p-2 text-[11px] text-muted-foreground">
                    {JSON.stringify(profile.onboardingSurvey, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteUserId)} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <DialogContent className="w-[min(96vw,28rem)]">
          <DialogHeader>
            <DialogTitle>Delete user permanently?</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              This removes <strong className="text-foreground">{deleteUserId?.name}</strong> ({deleteUserId?.email}) and all CRM
              data they own (contacts, projects, invoices, tasks, interactions, etc.). This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setDeleteUserId(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (!deleteUserId) return
                deleteMutation.mutate(deleteUserId.id, {
                  onSuccess: () => setDeleteUserId(null),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
                })
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-foreground sm:text-left">{value}</span>
    </div>
  )
}
