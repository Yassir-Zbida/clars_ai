"use client"

import { FormEvent, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CopyIcon, FileTextIcon, Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"

type TemplateRow = {
  id: string
  name: string
  slug: string
  channel: string
  body: string
}

const CHANNELS = ["EMAIL", "LINKEDIN", "SMS", "NOTE", "PROPOSAL"] as const

export default function AutomationTemplatesPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRow, setEditRow] = useState<TemplateRow | null>(null)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("EMAIL")
  const [body, setBody] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["automation", "templates"],
    queryFn: async () => {
      const res = await fetch("/api/automation/templates", { credentials: "include" })
      if (!res.ok) throw new Error("tpl")
      const json = (await res.json()) as { data: TemplateRow[] }
      return json.data
    },
  })

  function resetForm() {
    setName("")
    setSlug("")
    setChannel("EMAIL")
    setBody("")
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/automation/templates", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim().toLowerCase(), channel, body }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "create")
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "templates"] })
      toast.success("Template saved")
      setCreateOpen(false)
      resetForm()
    },
    onError: (e: Error) => toast.error(e.message || "Could not save"),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editRow) return
      const res = await fetch(`/api/automation/templates/${editRow.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          channel,
          body,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error || "update")
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "templates"] })
      toast.success("Updated")
      setEditRow(null)
      resetForm()
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/automation/templates/${id}`, { method: "DELETE", credentials: "include" })
      if (!res.ok) throw new Error("del")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["automation", "templates"] })
      toast.success("Removed")
    },
    onError: () => toast.error("Delete failed"),
  })

  const rows = data ?? []

  function openEdit(row: TemplateRow) {
    setEditRow(row)
    setName(row.name)
    setSlug(row.slug)
    setChannel((CHANNELS.includes(row.channel as (typeof CHANNELS)[number]) ? row.channel : "EMAIL") as (typeof CHANNELS)[number])
    setBody(row.body)
  }

  function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim() || !body.trim()) return
    createMutation.mutate()
  }

  function onUpdate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim() || !body.trim()) return
    updateMutation.mutate()
  }

  function copyBody(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success("Copied")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Templates</h2>
          <p className="text-xs text-muted-foreground">
            Reusable snippets. Use placeholders like <code className="text-[10px]">{"{{contact_name}}"}</code>,{" "}
            <code className="text-[10px]">{"{{company}}"}</code>, <code className="text-[10px]">{"{{your_name}}"}</code> for
            future merge.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => {
            resetForm()
            setCreateOpen(true)
          }}
        >
          <PlusIcon className="size-3.5" />
          New template
        </Button>
      </div>

      <Card className="border-input">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileTextIcon className="size-4 text-amber-400" />
            Library
          </CardTitle>
          <CardDescription className="text-xs">{rows.length} template(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm font-medium">{t.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{t.slug}</TableCell>
                      <TableCell className="text-xs">{t.channel}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Copy"
                          onClick={() => copyBody(t.body)}
                        >
                          <CopyIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Edit"
                          onClick={() => openEdit(t)}
                        >
                          <PencilIcon className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          aria-label="Delete"
                          onClick={() => deleteMutation.mutate(t.id)}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl sm:max-w-lg" showCloseButton={false}>
          <form onSubmit={onCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New template</DialogTitle>
              <DialogDescription>Slug must be lowercase with hyphens (e.g. cold-outreach-1).</DialogDescription>
            </DialogHeader>
            <TemplateFields
              name={name}
              setName={setName}
              slug={slug}
              setSlug={setSlug}
              channel={channel}
              setChannel={setChannel}
              body={body}
              setBody={setBody}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editRow)} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-xl sm:max-w-lg" showCloseButton={false}>
          <form onSubmit={onUpdate} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Edit template</DialogTitle>
            </DialogHeader>
            <TemplateFields
              name={name}
              setName={setName}
              slug={slug}
              setSlug={setSlug}
              channel={channel}
              setChannel={setChannel}
              body={body}
              setBody={setBody}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditRow(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateFields({
  name,
  setName,
  slug,
  setSlug,
  channel,
  setChannel,
  body,
  setBody,
}: {
  name: string
  setName: (v: string) => void
  slug: string
  setSlug: (v: string) => void
  channel: (typeof CHANNELS)[number]
  setChannel: (v: (typeof CHANNELS)[number]) => void
  body: string
  setBody: (v: string) => void
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="tpl-name">Name</Label>
        <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tpl-slug">Slug</Label>
        <Input
          id="tpl-slug"
          className="font-mono text-sm"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
          placeholder="my-template"
        />
      </div>
      <div className="space-y-2">
        <Label>Channel</Label>
        <Select
          value={channel}
          onValueChange={(v) =>
            typeof v === "string" && CHANNELS.includes(v as (typeof CHANNELS)[number]) && setChannel(v as (typeof CHANNELS)[number])
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="tpl-body">Body</Label>
        <textarea
          id="tpl-body"
          className="flex min-h-[160px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
    </>
  )
}
