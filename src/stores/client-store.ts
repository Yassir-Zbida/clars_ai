import { create } from 'zustand';
import type {
  clientSourceValues,
  clientStatusValues,
  clientTypeValues,
  healthLabelValues,
} from '@/app/api/clients/_lib';

type ClientStatus = (typeof clientStatusValues)[number];
type HealthLabel = (typeof healthLabelValues)[number];
type ClientSource = (typeof clientSourceValues)[number];
type ClientType = (typeof clientTypeValues)[number];

export interface ClientFilters {
  search: string;
  status: ClientStatus[];
  healthLabel: HealthLabel[];
  source: ClientSource[];
  tags: string[];
  type?: ClientType;
  currency?: string;
  minRevenue?: number;
  maxRevenue?: number;
  isFavorite?: boolean;
  isArchived: boolean;
  sortBy: 'createdAt' | 'lastContactAt' | 'totalRevenue' | 'healthScore' | 'fullName';
  sortDir: 'asc' | 'desc';
  page: number;
  limit: number;
}

const defaultFilters: ClientFilters = {
  search: '',
  status: [],
  healthLabel: [],
  source: [],
  tags: [],
  type: undefined,
  currency: undefined,
  minRevenue: undefined,
  maxRevenue: undefined,
  isFavorite: undefined,
  isArchived: false,
  sortBy: 'createdAt',
  sortDir: 'desc',
  page: 1,
  limit: 20,
};

interface ClientStore {
  filters: ClientFilters;
  setFilter: <K extends keyof ClientFilters>(key: K, value: ClientFilters[K]) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  view: 'table' | 'kanban';
  setView: (value: 'table' | 'kanban') => void;
  drawerOpen: boolean;
  drawerMode: 'create' | 'edit';
  editingClientId: string | null;
  openCreateDrawer: () => void;
  openEditDrawer: (id: string) => void;
  closeDrawer: () => void;
}

function computeActiveFilterCount(filters: ClientFilters) {
  let count = 0;
  if (filters.search) count += 1;
  if (filters.status.length) count += 1;
  if (filters.healthLabel.length) count += 1;
  if (filters.source.length) count += 1;
  if (filters.tags.length) count += 1;
  if (filters.type) count += 1;
  if (filters.currency) count += 1;
  if (filters.minRevenue !== undefined || filters.maxRevenue !== undefined) count += 1;
  if (filters.isFavorite !== undefined) count += 1;
  if (filters.isArchived) count += 1;
  if (filters.sortBy !== defaultFilters.sortBy || filters.sortDir !== defaultFilters.sortDir) count += 1;
  return count;
}

export const useClientStore = create<ClientStore>((set, get) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => {
      const nextFilters = { ...state.filters, [key]: value };
      return {
        filters: nextFilters,
        activeFilterCount: computeActiveFilterCount(nextFilters),
      };
    }),
  resetFilters: () => set({ filters: defaultFilters, activeFilterCount: 0 }),
  activeFilterCount: 0,
  selectedIds: [],
  toggleSelect: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((current) => current !== id)
          : [...state.selectedIds, id],
      };
    }),
  selectAll: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  view: 'table',
  setView: (value) => set({ view: value }),
  drawerOpen: false,
  drawerMode: 'create',
  editingClientId: null,
  openCreateDrawer: () =>
    set({
      drawerOpen: true,
      drawerMode: 'create',
      editingClientId: null,
    }),
  openEditDrawer: (id) =>
    set({
      drawerOpen: true,
      drawerMode: 'edit',
      editingClientId: id,
    }),
  closeDrawer: () =>
    set((state) => ({
      drawerOpen: false,
      editingClientId: state.drawerMode === 'edit' ? null : state.editingClientId,
    })),
}));

export function buildClientQueryParams(filters: ClientFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  for (const value of filters.status) params.append('status', value);
  for (const value of filters.healthLabel) params.append('healthLabel', value);
  for (const value of filters.source) params.append('source', value);
  for (const value of filters.tags) params.append('tags', value);
  if (filters.type) params.set('type', filters.type);
  if (filters.currency) params.set('currency', filters.currency);
  if (filters.minRevenue !== undefined) params.set('minRevenue', String(filters.minRevenue));
  if (filters.maxRevenue !== undefined) params.set('maxRevenue', String(filters.maxRevenue));
  if (filters.isFavorite !== undefined) params.set('isFavorite', String(filters.isFavorite));
  if (filters.isArchived) params.set('isArchived', 'true');
  params.set('sortBy', filters.sortBy);
  params.set('sortDir', filters.sortDir);
  params.set('page', String(filters.page));
  params.set('limit', String(filters.limit));
  return params;
}

export function resetClientStoreState() {
  useClientStore.setState({
    filters: defaultFilters,
    activeFilterCount: 0,
    selectedIds: [],
    view: 'table',
    drawerOpen: false,
    drawerMode: 'create',
    editingClientId: null,
  });
}
