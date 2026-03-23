"use client"

import { FormEvent, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeftIcon, Loader2, PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ContactDetails = {
  id: string
  fullName?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  birthday?: string
  jobTitle?: string
  notes?: string
  website?: string
  company?: string
}

export default function ContactViewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [formValues, setFormValues] = useState({
    fullName: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    birthday: "",
    jobTitle: "",
    website: "",
    notes: "",
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ["clients", "detail", id],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "GET",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to load contact")
      return (await response.json()) as { data: ContactDetails }
    },
    enabled: Boolean(id),
  })

  const contact = data?.data

  useEffect(() => {
    if (!contact) return
    setFormValues({
      fullName: contact.fullName || contact.name || "",
      company: contact.company || "",
      email: contact.email || "",
      phone: contact.phone || "",
      address: contact.address || "",
      birthday: contact.birthday ? new Date(contact.birthday).toISOString().split("T")[0] : "",
      jobTitle: contact.jobTitle || "",
      website: contact.website || "",
      notes: contact.notes || "",
    })
  }, [contact])

  const editMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formValues.fullName.trim(),
          company: formValues.company || undefined,
          email: formValues.email || undefined,
          phone: formValues.phone || undefined,
          address: formValues.address || undefined,
          birthday: formValues.birthday || undefined,
          jobTitle: formValues.jobTitle || undefined,
          website: formValues.website || undefined,
          notes: formValues.notes || undefined,
        }),
      })
      if (!response.ok) throw new Error("Failed to update contact")
      return await response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients", "detail", id] })
      await queryClient.invalidateQueries({ queryKey: ["clients", "list"] })
      setEditOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to delete contact")
      return await response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients", "list"] })
      router.push("/dashboard/clients")
    },
  })

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!formValues.fullName.trim()) return
    editMutation.mutate()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 pb-2 pt-0 lg:px-6 lg:pt-0">
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => router.push("/dashboard/clients")}>
          <ArrowLeftIcon className="size-4" />
          Back to contacts
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)} disabled={!contact}>
            <PencilIcon className="size-4" />
            Edit
          </Button>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={!contact}>
            <Trash2Icon className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border border-input">
        <CardHeader>
          <CardTitle>{contact?.fullName || contact?.name || "Contact details"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-24 items-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading contact...
            </div>
          ) : isError || !contact ? (
            <div className="text-sm text-muted-foreground">Unable to load this contact.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Name</p>
                <p className="font-medium">{contact.fullName || contact.name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p>{contact.company || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work Email</p>
                <p>{contact.email || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work Phone</p>
                <p>{contact.phone || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Work Address</p>
                <p>{contact.address || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Birthday</p>
                <p>{contact.birthday ? new Date(contact.birthday).toLocaleDateString() : "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Job title</p>
                <p>{contact.jobTitle || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Website</p>
                <p>{contact.website || "-"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-muted-foreground">Background info</p>
                <p>{contact.notes || "-"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[min(95vw,58rem)] rounded-xl p-0" showCloseButton={false}>
          <form onSubmit={handleEditSubmit} className="space-y-4 p-5">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>Update contact information and save changes.</DialogDescription>
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
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={formValues.company} onChange={(e) => setFormValues((prev) => ({ ...prev, company: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="email">Work Email</Label>
                <Input id="email" type="email" value={formValues.email} onChange={(e) => setFormValues((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="phone">Work Phone</Label>
                <Input id="phone" value={formValues.phone} onChange={(e) => setFormValues((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="address">Work Address</Label>
                <Input id="address" value={formValues.address} onChange={(e) => setFormValues((prev) => ({ ...prev, address: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="birthday">Birthday</Label>
                <Input id="birthday" type="date" value={formValues.birthday} onChange={(e) => setFormValues((prev) => ({ ...prev, birthday: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job title</Label>
                <Input id="jobTitle" value={formValues.jobTitle} onChange={(e) => setFormValues((prev) => ({ ...prev, jobTitle: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={formValues.website} onChange={(e) => setFormValues((prev) => ({ ...prev, website: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Background info</Label>
                <Input id="notes" value={formValues.notes} onChange={(e) => setFormValues((prev) => ({ ...prev, notes: e.target.value }))} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editMutation.isPending || !formValues.fullName.trim()}>
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[min(92vw,28rem)] rounded-xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
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
