import { create } from "zustand"

type ClientsUiState = {
  filtersOpen: boolean
  createOpen: boolean
  setFiltersOpen: (open: boolean) => void
  setCreateOpen: (open: boolean) => void
}

export const useClientsUiStore = create<ClientsUiState>((set) => ({
  filtersOpen: false,
  createOpen: false,
  setFiltersOpen: (open) => set({ filtersOpen: open }),
  setCreateOpen: (open) => set({ createOpen: open }),
}))

