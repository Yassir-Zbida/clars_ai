"use client"

import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Loader2, PlusIcon, SearchIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type ProjectItem = {
  id: string
  name?: string | null
  description?: string | null
  status?: "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED" | null
  priority?: "LOW" | "MEDIUM" | "HIGH" | null
  progress?: number | null
  startDate?: string | null
  endDate?: string | null
  budgetCents?: number | null
  currency?: string | null
  contacts?: Array<{ id: string; name: string; email?: string | null }>
}

type ContactOption = {
  id: string
  fullName?: string
  name?: string
  email?: string
}

const STATUS_OPTIONS = ["all", "DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"] as const
const PRIORITY_OPTIONS = ["all", "LOW", "MEDIUM", "HIGH"] as const

export default function ProjectsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [contactFilter, setContactFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [createOpen, setCreateOpen] = useState(false)
  const [contactFormSearch, setContactFormSearch] = useState("")
  const [contactSelectKey, setContactSelectKey] = useState(0)
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    notes: "",
    status: "ACTIVE" as ProjectItem["status"],
    priority: "MEDIUM" as ProjectItem["priority"],
    progress: "",
    startDate: "",
    endDate: "",
    budget: "",
    currency: "EUR",
    selectedContactIds: [] as string[],
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
    const q = contactFormSearch.trim().toLowerCase()
    return contactOptions.filter((c) => {
      if (formValues.selectedContactIds.includes(c.id)) return false
      if (!q) return true
      const label = (c.fullName || c.name || "").toLowerCase()
      const mail = (c.email || "").toLowerCase()
      return label.includes(q) || mail.includes(q)
    })
  }, [contactOptions, contactFormSearch, formValues.selectedContactIds])

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects", "list", query, statusFilter, priorityFilter, contactFilter, sortBy, sortDir],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (query.trim()) params.set("search", query.trim())
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter !== "all") params.set("priority", priorityFilter)
      if (contactFilter !== "all") params.set("contactId", contactFilter)
      params.set("sortBy", sortBy)
      params.set("sortDir", sortDir)

      const response = await fetch(`/api/projects?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to fetch projects")
      return (await response.json()) as { data: ProjectItem[]; total: number }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])
  const totalCount = data?.total ?? 0

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

  const createProjectMutation = useMutation({
    mutationFn: async () => {
      const budgetNumber = Number(formValues.budget)
      const progressNumber = Number(formValues.progress)
      const payload = {
        name: formValues.name,
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
      }
      const response = await fetch("/api/projects", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to create project")
      return (await response.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["projects", "list"] })
      setCreateOpen(false)
      setContactFormSearch("")
      setContactSelectKey((k) => k + 1)
      setFormValues({
        name: "",
        description: "",
        notes: "",
        status: "ACTIVE",
        priority: "MEDIUM",
        progress: "",
        startDate: "",
        endDate: "",
        budget: "",
        currency: "EUR",
        selectedContactIds: [],
      })
      router.push(`/dashboard/projects/${created.id}`)
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.name.trim()) return
    createProjectMutation.mutate()
  }

  const priorityBadgeVariant = (p: string | null | undefined) => {
    if (p === "HIGH") return "destructive" as const
    if (p === "LOW") return "secondary" as const
    return "outline" as const
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <Card className="rounded-xl border border-input ring-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Projects</h2>
              <p className="text-xs text-muted-foreground">{totalCount} records</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full min-w-[10rem] sm:w-56">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a project"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s === "all" ? "All statuses" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(v) => v && setPriorityFilter(v)}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-xs">
                      {s === "all" ? "All priorities" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={contactFilter} onValueChange={(v) => v && setContactFilter(v)}>
                <SelectTrigger className="h-8 min-w-[140px] text-xs">
                  <SelectValue placeholder="Contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Any contact
                  </SelectItem>
                  {contactOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.fullName || c.name || c.email || c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => v && setSortBy(v)}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt" className="text-xs">
                    Date created
                  </SelectItem>
                  <SelectItem value="updatedAt" className="text-xs">
                    Last updated
                  </SelectItem>
                  <SelectItem value="name" className="text-xs">
                    Name
                  </SelectItem>
                  <SelectItem value="budgetCents" className="text-xs">
                    Budget
                  </SelectItem>
                  <SelectItem value="progress" className="text-xs">
                    Progress
                  </SelectItem>
                  <SelectItem value="priority" className="text-xs">
                    Priority
                  </SelectItem>
                  <SelectItem value="status" className="text-xs">
                    Status
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortDir} onValueChange={(v) => setSortDir(v as "asc" | "desc")}>
                <SelectTrigger className="h-8 w-[96px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc" className="text-xs">
                    Desc
                  </SelectItem>
                  <SelectItem value="asc" className="text-xs">
                    Asc
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-3.5" />
                Add project
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading projects...
            </div>
          ) : isError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>Unable to load projects.</p>
              <p className="text-xs">Please refresh and try again.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>No projects found.</p>
              <p className="text-xs">Add a new project or adjust filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead className="min-w-[160px]">Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="min-w-[140px]">Contacts</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead className="w-[130px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((project) => (
                    <TableRow key={project.id} className="border-input hover:bg-muted/25">
                      <TableCell className="py-2.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{project.name || "Untitled project"}</span>
                          <span className="text-[11px] text-muted-foreground">{project.description || "No description"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{project.status || "ACTIVE"}</TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(project.priority)} className="text-[10px]">
                          {project.priority || "MEDIUM"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {typeof project.progress === "number" ? `${project.progress}%` : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex max-w-[200px] flex-wrap gap-1">
                          {(project.contacts ?? []).length ? (
                            project.contacts!.slice(0, 3).map((c) => (
                              <Badge key={c.id} variant="secondary" className="max-w-[120px] truncate text-[10px]">
                                {c.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {(project.contacts?.length ?? 0) > 3 ? (
                            <Badge variant="outline" className="text-[10px]">
                              +{(project.contacts?.length ?? 0) - 3}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {typeof project.budgetCents === "number"
                          ? `${project.currency || "EUR"} ${(project.budgetCents / 100).toFixed(2)}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                          View project
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[min(90vh,44rem)] w-[min(95vw,58rem)] overflow-y-auto rounded-xl p-0" showCloseButton={false}>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle>Add a Project</DialogTitle>
              <DialogDescription>Create a project, assign contacts, and open its details page.</DialogDescription>
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
                <Label htmlFor="notes">Internal notes</Label>
                <textarea
                  id="notes"
                  rows={3}
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                  value={formValues.notes}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Private notes for your team…"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="contact-select-add">Contacts</Label>
                <Input
                  id="contact-filter-add"
                  placeholder="Filter contacts in list…"
                  className="h-8 text-xs"
                  value={contactFormSearch}
                  onChange={(e) => setContactFormSearch(e.target.value)}
                />
                <Select
                  key={contactSelectKey}
                  onValueChange={(v) => {
                    if (typeof v === "string" && v) addContactToForm(v)
                  }}
                >
                  <SelectTrigger id="contact-select-add" className="w-full">
                    <SelectValue placeholder="Select a contact to add…" />
                  </SelectTrigger>
                  <SelectContent>
                    {contactsAvailableToAdd.length === 0 ? (
                      <div className="text-muted-foreground p-3 text-center text-xs">
                        {contactOptions.length === 0
                          ? "No contacts in your account yet."
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
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, status: value as ProjectItem["status"] }))}
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
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formValues.priority ?? "MEDIUM"}
                  onValueChange={(value) => setFormValues((prev) => ({ ...prev, priority: value as ProjectItem["priority"] }))}
                >
                  <SelectTrigger id="priority" className="w-full">
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
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
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
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProjectMutation.isPending || !formValues.name.trim()}>
                {createProjectMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
