"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellIcon, Loader2, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

type ReminderRow = {
  id: string
  fullName: string
  company: string | null
  email: string | null
  status: string
  nextFollowUpAt: string | null
  isOverdue: boolean
}

type ContactOption = { id: string; fullName?: string; name?: string }

export default function AutomationRemindersPage() {
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [clientId, setClientId] = useState("")
  const [whenLocal, setWhenLocal] = useState("")

  const { data: reminders, isLoading } = useQuery({
    queryKey: ["automation", "reminders"],
    queryFn: async () => {
      const res = await fetch("/api/automation/reminders?windowDays=120", { credentials: "include" })
      if (!res.ok) throw new Error("reminders")
      const json = (await res.json()) as { data: ReminderRow[] }
      return json.data
    },
  })

  const { data: contacts } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "300",
        sortBy: "fullName",
        sortDir: "asc",
      })
      const res = await fetch(`/api/clients?${params}`, { credentials: "include" })
      if (!res.ok) throw new Error("clients")
      const json = (await res.json()) as { data: ContactOption[] }
      return json.data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: { clientId: string; nextFollowUpAt: string | null }) => {
      const res = await fetch(`/api/clients/${payload.clientId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          payload.nextFollowUpAt === null ? { nextFollowUpAt: null } : { nextFollowUpAt: payload.nextFollowUpAt }
        ),
      })
      if (!res.ok) throw new Error("save")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "reminders"] })
      toast.success("Follow-up updated")
      setDialogOpen(false)
      setClientId("")
      setWhenLocal("")
    },
    onError: () => toast.error("Could not save follow-up"),
  })

  const rows = reminders ?? []

  function openSchedule() {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, "0")
    setWhenLocal(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    )
    setDialogOpen(true)
  }

  function submitSchedule(e: FormEvent) {
    e.preventDefault()
    if (!clientId || !whenLocal) return
    const iso = new Date(whenLocal).toISOString()
    saveMutation.mutate({ clientId, nextFollowUpAt: iso })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Smart reminders</h2>
          <p className="text-xs text-muted-foreground">
            Pulled from each contact&apos;s <strong>next follow-up</strong> field (next 120 days + overdue).
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={openSchedule}>
          <PlusIcon className="size-3.5" />
          Schedule follow-up
        </Button>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <BellIcon className="size-4 text-amber-400" />
            Queue
          </CardTitle>
          <CardDescription className="text-xs">{rows.length} scheduled touchpoint(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No follow-ups in range. Schedule one or set dates from a contact&apos;s profile.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="w-[200px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{r.fullName || "Unnamed"}</span>
                          {r.company ? <span className="text-xs text-muted-foreground">{r.company}</span> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{r.status}</span>
                        {r.isOverdue ? (
                          <Badge variant="destructive" className="ml-2 text-[10px]">
                            Overdue
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.nextFollowUpAt ? new Date(r.nextFollowUpAt).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Link
                            href={`/dashboard/clients/${r.id}`}
                            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 text-xs")}
                          >
                            Open
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => saveMutation.mutate({ clientId: r.id, nextFollowUpAt: null })}
                            disabled={saveMutation.isPending}
                          >
                            Clear
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-xl sm:max-w-md" showCloseButton={false}>
          <form onSubmit={submitSchedule} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Schedule follow-up</DialogTitle>
              <DialogDescription>Sets <code className="text-xs">nextFollowUpAt</code> on the contact.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select
                value={clientId || undefined}
                onValueChange={(v) => typeof v === "string" && setClientId(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose contact" />
                </SelectTrigger>
                <SelectContent>
                  {(contacts ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fullName || c.name || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">When</Label>
              <input
                id="when"
                type="datetime-local"
                required
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                value={whenLocal}
                onChange={(e) => setWhenLocal(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || !clientId}>
                {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
