import { create } from "zustand"

export type ClientsHealthFilter = "all" | "strong" | "neutral" | "at-risk"

type ClientsFiltersState = {
  query: string
  health: ClientsHealthFilter
  setQuery: (query: string) => void
  setHealth: (health: ClientsHealthFilter) => void
  reset: () => void
}

export const useClientsFiltersStore = create<ClientsFiltersState>((set) => ({
  query: "",
  health: "all",
  setQuery: (query) => set({ query }),
  setHealth: (health) => set({ health }),
  reset: () => set({ query: "", health: "all" }),
}))

