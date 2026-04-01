"use client"

import { useQuery } from "@tanstack/react-query"

export type AdminUserRow = {
  id: string
  name: string
  email: string
  status: "ACTIVE" | "SOFT_DELETED"
  createdAt: string | null
  updatedAt: string | null
}

export type AdminUsersListResponse = {
  data: AdminUserRow[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export type AdminUsersFilters = {
  search: string
  status: "all" | "active" | "deleted"
  page: number
  limit: number
}

export function useAdminUsers(filters: AdminUsersFilters) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.search.trim()) params.set("search", filters.search.trim())
      params.set("status", filters.status)
      params.set("page", String(filters.page))
      params.set("limit", String(filters.limit))
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include", cache: "no-store" })
      if (!res.ok) throw new Error("admin-users")
      const json = (await res.json()) as AdminUsersListResponse
      return json
    },
  })
}

export type AdminUserProfile = {
  id: string
  name: string | null
  email: string | null
  emailVerified: string | null
  image: string | null
  createdAt: string | null
  updatedAt: string | null
  deletedAt: string | null
  status: "ACTIVE" | "ARCHIVED"
  defaultCurrency: string | null
  companyName: string | null
  companyTagline: string | null
  companyAddress: string | null
  companyPhone: string | null
  companyEmail: string | null
  companyWebsite: string | null
  taxId: string | null
  paymentInfo: string | null
  signatureText: string | null
  invoiceColor: string | null
  onboardingSurveyCompletedAt: string | null
  onboardingSurvey: unknown
  otpEnabled: boolean
  hasLogo: boolean
  hasSignatureImage: boolean
}
