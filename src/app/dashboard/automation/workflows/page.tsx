"use client"

import { FormEvent, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { GitBranchIcon, Loader2, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

type WorkflowRow = {
  id: string
  name: string
  description: string | null
  trigger: string
  action: string
  enabled: boolean
}

const TRIGGERS = [
  { value: "NEW_LEAD", label: "New lead created" },
  { value: "INVOICE_OVERDUE", label: "Invoice becomes overdue" },
  { value: "PAYMENT_RECEIVED", label: "Payment received" },
  { value: "PROJECT_COMPLETED", label: "Project completed" },
  { value: "CONTACT_AT_RISK", label: "Contact marked at risk" },
] as const

const ACTIONS = [
  { value: "NOTIFY_IN_APP", label: "In-app notification (planned)" },
  { value: "LOG_INTERACTION", label: "Log interaction draft (planned)" },
  { value: "EMAIL_TEMPLATE", label: "Send email template (planned)" },
  { value: "NONE", label: "Store rule only" },
] as const

function label(map: readonly { value: string; label: string }[], v: string) {
  return map.find((x) => x.value === v)?.label ?? v
}

export default function AutomationWorkflowsPage() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [trigger, setTrigger] = useState<string>("NEW_LEAD")
  const [action, setAction] = useState<string>("NOTIFY_IN_APP")

  const { data, isLoading } = useQuery({
    queryKey: ["automation", "workflows"],
    queryFn: async () => {
      const res = await fetch("/api/automation/workflows", { credentials: "include" })
      if (!res.ok) throw new Error("wf")
      const json = (await res.json()) as { data: WorkflowRow[] }
      return json.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          trigger,
          action,
          enabled: true,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "create")
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "workflows"] })
      toast.success("Workflow created")
      setOpen(false)
      setName("")
      setDescription("")
    },
    onError: (e: Error) => toast.error(e.message || "Could not create"),
  })

  const patchMutation = useMutation({
    mutationFn: async (payload: { id: string; enabled: boolean }) => {
      const res = await fetch(`/api/automation/workflows/${payload.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: payload.enabled }),
      })
      if (!res.ok) throw new Error("patch")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "workflows"] })
    },
    onError: () => toast.error("Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/workflows/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("del")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "workflows"] })
      toast.success("Removed")
    },
    onError: () => toast.error("Delete failed"),
  })

  const rows = data ?? []

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Workflows</h2>
          <p className="text-xs text-muted-foreground">
            Rules are saved per workspace. A background job or integration can evaluate triggers later—today this is your
            automation catalog.
          </p>
        </div>
        <Button type="button" size="sm" className="h-8 gap-1 text-xs" onClick={() => setOpen(true)}>
          <PlusIcon className="size-3.5" />
          New workflow
        </Button>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitBranchIcon className="size-4 text-amber-400" />
            Rules
          </CardTitle>
          <CardDescription className="text-xs">{rows.length} workflow(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No workflows yet. Create your first rule.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="w-[120px]">On</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{w.name}</div>
                        {w.description ? <p className="text-xs text-muted-foreground">{w.description}</p> : null}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                        {label(TRIGGERS, w.trigger)}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                        {label(ACTIONS, w.action)}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant={w.enabled ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => patchMutation.mutate({ id: w.id, enabled: !w.enabled })}
                          disabled={patchMutation.isPending}
                        >
                          {w.enabled ? "Enabled" : "Paused"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          aria-label="Delete"
                          onClick={() => deleteMutation.mutate(w.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-xl sm:max-w-md" showCloseButton={false}>
          <form onSubmit={onCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New workflow</DialogTitle>
              <DialogDescription>Name the rule and pick a trigger. Actions are placeholders until jobs are wired.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="wf-name">Name</Label>
              <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ping on overdue invoice" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wf-desc">Description</Label>
              <Input id="wf-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label>When</Label>
              <Select value={trigger} onValueChange={(v) => typeof v === "string" && setTrigger(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Then</Label>
              <Select value={action} onValueChange={(v) => typeof v === "string" && setAction(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
