"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { toast } from "sonner"
import { Loader2, PlusIcon, FilterIcon } from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useClientsFiltersStore,
  type ClientsHealthFilter,
} from "@/stores/clients-filters-store"
import { useClientsUiStore } from "@/stores/clients-ui-store"

function getPageTitle(pathname: string | null): string {
  if (!pathname) return "Overview"
  if (pathname === "/dashboard") return "Overview"
  if (pathname.startsWith("/dashboard/clients/pipeline")) return "Clients · Pipeline"
  if (pathname.startsWith("/dashboard/clients/segments")) return "Clients · Segments"
  if (pathname.startsWith("/dashboard/clients/import")) return "Clients · Import / Export"
  if (pathname.startsWith("/dashboard/clients")) return "All clients"
  return "Overview"
}

export function SiteHeader() {
  const queryClient = useQueryClient()
  const pathname = usePathname()
  const title = getPageTitle(pathname)
  const router = useRouter()

  const showClientListActions = pathname === "/dashboard/clients"

  const { query, setQuery, health, setHealth } = useClientsFiltersStore()
  const { filtersOpen, setFiltersOpen, createOpen, setCreateOpen } =
    useClientsUiStore()
  const [draftQuery, setDraftQuery] = useState(query)
  const [draftHealth, setDraftHealth] = useState<ClientsHealthFilter>(health)

  useEffect(() => {
    if (!filtersOpen) return
    setDraftQuery(query)
    setDraftHealth(health)
  }, [filtersOpen, query, health])

  const { mutateAsync: createClient, isPending: isCreating } = useMutation({
    mutationFn: async (input: {
      fullName: string
      email?: string
      phone?: string
      company?: string
      address?: string
      notes?: string
    }) => {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(input),
      })
      const body = await response.json()
      if (!response.ok) {
        throw new Error(body?.error || "Unable to create client.")
      }
      return body
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients", "list"] })
    },
  })
  const [createName, setCreateName] = useState("")
  const [createEmail, setCreateEmail] = useState("")
  const [createPhone, setCreatePhone] = useState("")
  const [createCompany, setCreateCompany] = useState("")
  const [createAddress, setCreateAddress] = useState("")
  const [createNotes, setCreateNotes] = useState("")

  function toOptionalString(v: string): string | undefined {
    const trimmed = v.trim()
    return trimmed.length ? trimmed : undefined
  }

  const canCreate = useMemo(() => createName.trim().length > 0, [createName])

  return (
    <header className="flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center justify-between gap-2 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 h-4 data-vertical:self-auto"
          />
          <h1 className="text-base font-medium">{title}</h1>
        </div>

        {showClientListActions && (
          <div className="flex items-center gap-2">
            <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DialogTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-lg border-border/70 bg-background/60 text-xs md:text-sm"
                  />
                }
              >
                <FilterIcon className="size-3.5" />
                Filters
              </DialogTrigger>
              <DialogContent className="w-[min(92vw,30rem)]">
                <DialogHeader>
                  <DialogTitle>Filters</DialogTitle>
                  <DialogDescription>
                    Filter the client list by search and health score.
                  </DialogDescription>
                </DialogHeader>

                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault()
                    setQuery(draftQuery)
                    setHealth(draftHealth)
                    setFiltersOpen(false)
                  }}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="clients-filter-query">Search</Label>
                    <Input
                      id="clients-filter-query"
                      value={draftQuery}
                      onChange={(e) => setDraftQuery(e.target.value)}
                      placeholder="name, company, or email"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Health</Label>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { key: "all", label: "All" },
                          { key: "strong", label: "Strong" },
                          { key: "neutral", label: "Neutral" },
                          { key: "at-risk", label: "At risk" },
                        ] as const
                      ).map((item) => (
                        <Button
                          key={item.key}
                          type="button"
                          variant={
                            draftHealth === item.key ? "default" : "outline"
                          }
                          size="sm"
                          className="rounded-lg"
                          onClick={() => setDraftHealth(item.key)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="submit"
                      className="gap-1.5 rounded-lg text-xs md:text-sm"
                    >
                      Apply
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDraftQuery("")
                        setDraftHealth("all")
                      }}
                    >
                      Reset
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetTrigger
                render={
                  <Button
                    size="sm"
                    className="gap-1.5 rounded-lg text-xs md:text-sm"
                  />
                }
              >
                <PlusIcon className="size-3.5" />
                Add contact
              </SheetTrigger>

              <SheetContent
                side="right"
                className="w-[min(96vw,52rem)] max-w-none overflow-y-auto p-0 sm:max-w-none"
                showCloseButton={false}
              >
                <SheetHeader className="border-b px-5 py-3">
                  <SheetTitle>Add a Contact</SheetTitle>
                  <SheetDescription>
                    Create a new contact or company record.
                  </SheetDescription>
                </SheetHeader>

                <form
                  className="flex h-full flex-col"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!canCreate) {
                      toast.error("Client name is required.")
                      return
                    }

                    try {
                      await createClient({
                        fullName: createName.trim(),
                        email: toOptionalString(createEmail),
                        phone: toOptionalString(createPhone),
                        company: toOptionalString(createCompany),
                        address: toOptionalString(createAddress),
                        notes: toOptionalString(createNotes),
                      })

                      toast.success("Client created.")
                      setCreateOpen(false)
                      // Force a refresh so the list updates immediately.
                      router.refresh()
                      setCreateName("")
                      setCreateEmail("")
                      setCreatePhone("")
                      setCreateCompany("")
                      setCreateAddress("")
                      setCreateNotes("")
                    } catch (err) {
                      const message =
                        err instanceof Error
                          ? err.message
                          : "Unable to create client."
                      toast.error(message)
                    }
                  }}
                >
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label htmlFor="new-client-name">Name (required)</Label>
                      <Input
                        id="new-client-name"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="Full name"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-client-email">Email</Label>
                      <Input
                        id="new-client-email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        placeholder="name@company.com"
                        type="email"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-client-company">Company</Label>
                      <Input
                        id="new-client-company"
                        value={createCompany}
                        onChange={(e) => setCreateCompany(e.target.value)}
                        placeholder="Company name"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-client-job">Job title</Label>
                      <Input id="new-client-job" placeholder="Job title" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-client-phone">Phone</Label>
                      <Input
                        id="new-client-phone"
                        value={createPhone}
                        onChange={(e) => setCreatePhone(e.target.value)}
                        placeholder="+1 555 000 000"
                        type="tel"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-client-website">Website</Label>
                      <Input id="new-client-website" placeholder="https://example.com" />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label htmlFor="new-client-address">Address</Label>
                      <Input
                        id="new-client-address"
                        value={createAddress}
                        onChange={(e) => setCreateAddress(e.target.value)}
                        placeholder="Street, City"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label htmlFor="new-client-notes">Background info</Label>
                      <Input
                        id="new-client-notes"
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                      <Label htmlFor="new-client-company-email">Company email</Label>
                      <Input id="new-client-company-email" placeholder="team@company.com" />
                    </div>
                  </div>

                  <SheetFooter className="mt-auto border-t p-4 sm:flex-row sm:justify-start">
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="gap-1.5 rounded-lg text-xs md:text-sm"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create client"
                      )}
                    </Button>
                    <SheetClose
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isCreating}
                        />
                      }
                    >
                      Cancel
                    </SheetClose>
                  </SheetFooter>
                </form>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>
    </header>
  )
}
