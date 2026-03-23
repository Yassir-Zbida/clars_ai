"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, CopyIcon, Loader2, PencilIcon, Trash2Icon, UserRoundIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProjectDetails = {
  id: string
  name?: string | null
  description?: string | null
  notes?: string | null
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | null
  priority?: "LOW" | "MEDIUM" | "HIGH" | null
  progress?: number | null
  startDate?: string | null
  endDate?: string | null
  budgetCents?: number | null
  currency?: string | null
  assignedClientIds?: string[]
  contacts?: Array<{ id: string; name: string; email?: string | null }>
}

type ContactOption = {
  id: string
  fullName?: string
  name?: string
  email?: string
}

export default function ProjectViewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [editOpen, setEditOpen] = useState(false)
  const [contactsOpen, setContactsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")
  const [contactSelectKey, setContactSelectKey] = useState(0)
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    notes: "",
    status: "ACTIVE" as ProjectDetails["status"],
    priority: "MEDIUM" as ProjectDetails["priority"],
    progress: "",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "EUR",
    selectedContactIds: [] as string[],
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "GET",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to load project")
      return (await response.json()) as { data: ProjectDetails }
    },
    enabled: Boolean(id),
  })

  const { data: contactsData } = useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "200",
        sortBy: "fullName",
        sortDir: "asc",
      })
      const response = await fetch(`/api/clients?${params}`, { credentials: "include" })
      if (!response.ok) throw new Error("Failed to load contacts")
      const json = (await response.json()) as { data: ContactOption[] }
      return json.data
    },
  })

  const contactOptions = contactsData ?? []

  const contactsAvailableToAdd = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return contactOptions.filter((c) => {
      if (formValues.selectedContactIds.includes(c.id)) return false
      if (!q) return true
      const label = (c.fullName || c.name || "").toLowerCase()
      const mail = (c.email || "").toLowerCase()
      return label.includes(q) || mail.includes(q)
    })
  }, [contactOptions, pickerQuery, formValues.selectedContactIds])

  const project = data?.data

  useEffect(() => {
    if (!project) return
    const ids = project.assignedClientIds?.length
      ? project.assignedClientIds
      : (project.contacts?.map((c) => c.id) ?? [])
    setFormValues({
      name: project.name || "",
      description: project.description || "",
      notes: project.notes || "",
      status: project.status || "ACTIVE",
      priority: project.priority || "MEDIUM",
      progress: typeof project.progress === "number" ? String(project.progress) : "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split("T")[0] : "",
      budget: typeof project.budgetCents === "number" ? (project.budgetCents / 100).toString() : "",
      currency: project.currency || "EUR",
      selectedContactIds: ids,
    })
  }, [project])

  const addContactToForm = (cid: string) => {
    if (!cid) return
    setFormValues((prev) =>
      prev.selectedContactIds.includes(cid)
        ? prev
        : { ...prev, selectedContactIds: [...prev.selectedContactIds, cid] }
    )
    setContactSelectKey((k) => k + 1)
  }

  const removeContactFromForm = (cid: string) => {
    setFormValues((prev) => ({
      ...prev,
      selectedContactIds: prev.selectedContactIds.filter((x) => x !== cid),
    }))
  }

  const contactLabel = (cid: string) => {
    const c = contactOptions.find((x) => x.id === cid)
    return c?.fullName || c?.name || c?.email || cid
  }

  const editMutation = useMutation({
    mutationFn: async () => {
      const budgetNumber = Number(formValues.budget)
      const progressNumber = Number(formValues.progress)
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formValues.name.trim(),
          description: formValues.description || undefined,
          notes: formValues.notes || undefined,
          status: formValues.status,
          priority: formValues.priority,
          progress:
            Number.isFinite(progressNumber) && progressNumber >= 0 && progressNumber <= 100
              ? Math.round(progressNumber)
              : undefined,
          startDate: formValues.startDate || undefined,
          endDate: formValues.endDate || undefined,
          budgetCents: Number.isFinite(budgetNumber) && budgetNumber > 0 ? Math.round(budgetNumber * 100) : undefined,
          currency: formValues.currency || "EUR",
          assignedClientIds: formValues.selectedContactIds,
        }),
      })
      if (!response.ok) throw new Error("Failed to update project")
      return await response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "detail", id] })
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      setEditOpen(false)
      setContactsOpen(false)
    },
  })

  const contactsOnlyMutation = useMutation({
    mutationFn: async (assignedClientIds: string[]) => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedClientIds }),
      })
      if (!response.ok) throw new Error("Failed to update contacts")
      return await response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "detail", id] })
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      setContactsOpen(false)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project")
      const payload = {
        name: `${project.name || "Project"} (copy)`,
        description: project.description || undefined,
        notes: project.notes || undefined,
        status: project.status || "ACTIVE",
        priority: project.priority || "MEDIUM",
        progress: typeof project.progress === "number" ? project.progress : undefined,
        startDate: project.startDate ? project.startDate.slice(0, 10) : undefined,
        endDate: project.endDate ? project.endDate.slice(0, 10) : undefined,
        budgetCents:
          typeof project.budgetCents === "number" && project.budgetCents > 0 ? project.budgetCents : undefined,
        currency: project.currency || "EUR",
        assignedClientIds: project.assignedClientIds?.length
          ? project.assignedClientIds
          : (project.contacts?.map((c) => c.id) ?? []),
      }
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to duplicate project")
      return (await response.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      router.push(`/dashboard/projects/${created.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete project")
      return await response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      router.push("/dashboard/projects")
    },
  })

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.name.trim()) return
    editMutation.mutate()
  }

  const handleSaveContacts = () => {
    contactsOnlyMutation.mutate(formValues.selectedContactIds)
  }

  const daysUntilEnd =
    project?.endDate != null
      ? Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

  const priorityBadgeVariant = (p: string | null | undefined) => {
    if (p === "HIGH") return "destructive" as const
    if (p === "LOW") return "secondary" as const
    return "outline" as const
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/projects")}>
          <ArrowLeftIcon className="size-4" />
          Back to projects
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setContactsOpen(true)} disabled={!project}>
            <UserRoundIcon className="size-4" />
            Assign contacts
          </Button>
          <Button type="button" variant="outline" onClick={() => duplicateMutation.mutate()} disabled={!project || duplicateMutation.isPending}>
            <CopyIcon className="size-4" />
            Duplicate
          </Button>
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)} disabled={!project}>
            <PencilIcon className="size-4" />
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={!project}>
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-xl border border-input">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle>{project?.name || "Project details"}</CardTitle>
              {project?.status ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{project.status}</Badge>
                  <Badge variant={priorityBadgeVariant(project.priority)}>{project.priority || "MEDIUM"}</Badge>
                  {typeof project.progress === "number" ? (
                    <Badge variant="outline">{project.progress}% complete</Badge>
                  ) : null}
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-24 items-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading project...
              </div>
            ) : isError || !project ? (
              <div className="text-sm text-muted-foreground">Unable to load this project.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Start date</p>
                  <p>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End date</p>
                  <p>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}</p>
                </div>
                {daysUntilEnd != null && !Number.isNaN(daysUntilEnd) ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Timeline</p>
                    <p>{daysUntilEnd >= 0 ? `${daysUntilEnd} days until end` : `${Math.abs(daysUntilEnd)} days overdue`}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p>
                    {typeof project.budgetCents === "number"
                      ? `${project.currency || "EUR"} ${(project.budgetCents / 100).toFixed(2)}`
                      : "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p>{project.description || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-muted-foreground">Internal notes</p>
                  <p className="whitespace-pre-wrap">{project.notes || "-"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-input">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assigned contacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (project?.contacts?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No contacts assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {project!.contacts!.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/clients/${c.id}`} className="text-primary text-sm font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.email ? <p className="text-muted-foreground text-xs">{c.email}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            <Button type="button" variant="outline" size="sm" className="w-full" disabled={!project} onClick={() => setContactsOpen(true)}>
              Manage assignments
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,44rem)] w-[min(95vw,58rem)] overflow-y-auto rounded-xl p-0" showCloseButton={false}>
          <form onSubmit={handleEditSubmit} className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project information and save changes.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="name">Project name</Label>
                <Input id="name" required value={formValues.name} onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={formValues.description} onChange={(e) => setFormValues((prev) => ({ ...prev, description: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes-edit">Internal notes</Label>
                <textarea
                  id="notes-edit"
                  rows={3}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={formValues.notes}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="contact-select-edit">Contacts</Label>
                <Input
                  id="contact-filter-edit"
                  placeholder="Filter contacts in list…"
                  className="h-8 text-xs"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                />
                <Select
                  key={contactSelectKey}
                  onValueChange={(v) => {
                    if (typeof v === "string" && v) addContactToForm(v)
                  }}
                >
                  <SelectTrigger id="contact-select-edit" className="w-full">
                    <SelectValue placeholder="Select a contact to add…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsAvailableToAdd.length === 0 ? (
                      <div className="text-muted-foreground p-3 text-center text-xs">
                        {contactOptions.length === 0
                          ? "No contacts yet."
                          : "All matching contacts are already added."}
                      </div>
                    ) : (
                      contactsAvailableToAdd.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-sm">
                          {c.fullName || c.name || c.email || c.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formValues.selectedContactIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {formValues.selectedContactIds.map((cid) => (
                      <Badge key={cid} variant="secondary" className="max-w-full gap-1 py-1 pr-1 pl-2">
                        <span className="truncate">{contactLabel(cid)}</span>
                        <button
                          type="button"
                          className="hover:bg-muted rounded p-0.5"
                          aria-label={`Remove ${contactLabel(cid)}`}
                          onClick={() => removeContactFromForm(cid)}
                        >
                          <XIcon className="size-3.5 shrink-0 opacity-70" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-[11px]">No contacts selected (optional).</p>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formValues.status ?? "ACTIVE"}
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, status: value as ProjectDetails["status"] }))}
                >
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                    <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                    <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority-edit">Priority</Label>
                <Select
                  value={formValues.priority ?? "MEDIUM"}
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, priority: value as ProjectDetails["priority"] }))}
                >
                  <SelectTrigger id="priority-edit" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="progress-edit">Progress (%)</Label>
                <Input
                  id="progress-edit"
                  type="number"
                  min={0}
                  max={100}
                  value={formValues.progress}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, progress: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={formValues.currency} onChange={(e) => setFormValues((prev) => ({ ...prev, currency: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" type="date" value={formValues.startDate} onChange={(e) => setFormValues((prev) => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="endDate">End date</Label>
                <Input id="endDate" type="date" value={formValues.endDate} onChange={(e) => setFormValues((prev) => ({ ...prev, endDate: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="budget">Budget</Label>
                <Input id="budget" type="number" min="0" step="0.01" value={formValues.budget} onChange={(e) => setFormValues((prev) => ({ ...prev, budget: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending || !formValues.name.trim()}>
                {editMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contactsOpen} onOpenChange={setContactsOpen}>
        <DialogContent className="max-h-[min(90vh,32rem)] w-[min(92vw,28rem)] overflow-y-auto rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Assign contacts</DialogTitle>
            <DialogDescription>Select which contacts are linked to this project.</DialogDescription>
          </DialogHeader>
          <Label htmlFor="contact-select-manage">Add contact</Label>
          <Input
            id="contact-filter-manage"
            placeholder="Filter contacts…"
            className="h-8 text-xs"
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
          />
          <Select
            key={`manage-${contactSelectKey}`}
            onValueChange={(v) => {
              if (typeof v === "string" && v) addContactToForm(v)
            }}
          >
            <SelectTrigger id="contact-select-manage" className="w-full">
              <SelectValue placeholder="Select a contact to add…" />
            </SelectTrigger>
            <SelectContent>
              {contactsAvailableToAdd.length === 0 ? (
                <div className="text-muted-foreground p-3 text-center text-xs">
                  {contactOptions.length === 0 ? "No contacts yet." : "No more contacts to add."}
                </div>
              ) : (
                contactsAvailableToAdd.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-sm">
                    {c.fullName || c.name || c.email || c.id}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
            {formValues.selectedContactIds.length === 0 ? (
              <p className="text-muted-foreground w-full text-center text-xs">None selected</p>
            ) : (
              formValues.selectedContactIds.map((cid) => (
                <Badge key={cid} variant="secondary" className="max-w-full gap-1 py-1 pr-1 pl-2">
                  <span className="truncate">{contactLabel(cid)}</span>
                  <button
                    type="button"
                    className="hover:bg-muted rounded p-0.5"
                    aria-label={`Remove ${contactLabel(cid)}`}
                    onClick={() => removeContactFromForm(cid)}
                  >
                    <XIcon className="size-3.5 shrink-0 opacity-70" />
                  </button>
                </Badge>
              ))
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setContactsOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={contactsOnlyMutation.isPending} onClick={handleSaveContacts}>
              {contactsOnlyMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save assignments"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[min(92vw,28rem)] rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
