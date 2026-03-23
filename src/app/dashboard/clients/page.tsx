"use client"

import { FormEvent, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, PlusIcon, SearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useClientsFiltersStore } from "@/stores/clients-filters-store"

type ContactListItem = {
  id: string
  fullName?: string
  name?: string
  email?: string
  phone?: string
  company?: string
  jobTitle?: string
  address?: string
  website?: string
  notes?: string
  birthday?: string
}

export default function ClientsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { query, setQuery } = useClientsFiltersStore()
  const [createOpen, setCreateOpen] = useState(false)
  const [formValues, setFormValues] = useState({
    fullName: "",
    email: "",
    company: "",
    phone: "",
    jobTitle: "",
    address: "",
    notes: "",
    website: "",
    birthday: "",
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["clients", "list", query],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: "1",
        limit: "20",
        sortBy: "createdAt",
        sortDir: "desc",
      })
      if (query.trim()) params.set("search", query.trim())

      const response = await fetch(`/api/clients?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to fetch clients")
      return (await response.json()) as {
        data: ContactListItem[]
        total: number
        page: number
        limit: number
        hasMore: boolean
      }
    },
  })

  const rows = useMemo(() => data?.data ?? [], [data])

  const createContactMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        fullName: formValues.fullName,
        email: formValues.email || undefined,
        company: formValues.company || undefined,
        phone: formValues.phone || undefined,
        jobTitle: formValues.jobTitle || undefined,
        address: formValues.address || undefined,
        website: formValues.website || undefined,
        notes: formValues.notes || undefined,
        birthday: formValues.birthday || undefined,
      }
      const response = await fetch("/api/clients", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error("Failed to create contact")
      return (await response.json()) as { data: { id: string } }
    },
    onSuccess: async ({ data: created }) => {
      await queryClient.invalidateQueries({ queryKey: ["clients", "list"] })
      setCreateOpen(false)
      setFormValues({
        fullName: "",
        email: "",
        company: "",
        phone: "",
        jobTitle: "",
        address: "",
        notes: "",
        website: "",
        birthday: "",
      })
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.fullName.trim()) return
    createContactMutation.mutate()
  }

  const totalCount = data?.total ?? 0

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <Card className="rounded-xl border border-input ring-0">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Contacts and companies</h2>
              <p className="text-xs text-muted-foreground">{totalCount} records</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-72">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a contact or company"
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <Button type="button" size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                <PlusIcon className="size-3.5" />
                Add contact
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading contacts...
            </div>
          ) : isError ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>Unable to load contacts.</p>
              <p className="text-xs">Please refresh and try again.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
              <p>No contacts found for this filter.</p>
              <p className="text-xs">Try clearing your search and filters.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-input">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-input">
                    <TableHead className="w-[40%]">Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[130px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((contact) => (
                    <TableRow key={contact.id} className="border-input hover:bg-muted/25">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                            {(contact.fullName || contact.name || "?").slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{contact.fullName || contact.name || "Unnamed contact"}</span>
                            <span className="text-[11px] text-muted-foreground">{contact.jobTitle || "No title"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{contact.company || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{contact.email || "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/clients/${contact.id}`)}>
                          View contact
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
        <DialogContent className="w-[min(95vw,58rem)] rounded-xl p-0" showCloseButton={false}>
          <form onSubmit={handleSubmit} className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle>Add a Contact</DialogTitle>
              <DialogDescription>Use the same contact fields shown in the details panel.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="fullName">Name</Label>
                <Input
                  id="fullName"
                  required
                  value={formValues.fullName}
                  onChange={(e) => setFormValues((prev) => ({ ...prev, fullName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={formValues.email} onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="company">Company name</Label>
                <Input id="company" value={formValues.company} onChange={(e) => setFormValues((prev) => ({ ...prev, company: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={formValues.phone} onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job title</Label>
                <Input id="jobTitle" value={formValues.jobTitle} onChange={(e) => setFormValues((prev) => ({ ...prev, jobTitle: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formValues.address} onChange={(e) => setFormValues((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formValues.website} onChange={(e) => setFormValues((prev) => ({ ...prev, website: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input id="birthday" type="date" value={formValues.birthday} onChange={(e) => setFormValues((prev) => ({ ...prev, birthday: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="notes">Background info</Label>
                <Input id="notes" value={formValues.notes} onChange={(e) => setFormValues((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createContactMutation.isPending || !formValues.fullName.trim()}>
                {createContactMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create contact"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
