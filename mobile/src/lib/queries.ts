import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './api';
import { useAuth } from './auth';
import type {
  AnalysisResult,
  Dictionaries,
  IngredientCard,
  IngredientListItem,
  Me,
  Page,
  ProductCard,
  ProductListItem,
  ProductSearchHit,
  ReminderKind,
  ShelfStatus,
  ShelfView,
} from './types';

const HOUR = 60 * 60 * 1000;

/** Подписи и справочники с сервера (кэш на сутки). */
export function useDictionaries() {
  return useQuery({
    queryKey: ['dictionaries'],
    queryFn: () => api<Dictionaries>('/api/mobile/dictionaries'),
    staleTime: 24 * HOUR,
    gcTime: 7 * 24 * HOUR,
  });
}

export function useMe() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/mobile/me'),
    enabled: status === 'signedIn',
  });
}

export function useShelf() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['shelf'],
    queryFn: () => api<ShelfView>('/api/mobile/shelf'),
    enabled: status === 'signedIn',
    retry: (count, error) => (error as { status?: number }).status !== 409 && count < 2,
  });
}

export function useAnalyze() {
  return useMutation({
    mutationFn: (text: string) => api<AnalysisResult>('/api/analyze', { body: { text } }),
  });
}

function toQuery(params: Record<string, string | string[] | undefined>, cursor?: string | null) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value) qs.set(key, value);
  }
  if (cursor) qs.set('cursor', cursor);
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export interface IngredientQuery {
  q?: string;
  category?: string[];
  evidence?: string[];
  flag?: string[];
}

export function useIngredientList(params: IngredientQuery, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ['ingredients', params],
    queryFn: ({ pageParam }) =>
      api<Page<IngredientListItem>>(`/api/mobile/ingredients${toQuery({ ...params }, pageParam)}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: HOUR,
  });
}

export function useIngredient(slug: string) {
  return useQuery({
    queryKey: ['ingredient', slug],
    queryFn: () => api<IngredientCard>(`/api/mobile/ingredients/${encodeURIComponent(slug)}`),
    staleTime: HOUR,
  });
}

export interface ProductQuery {
  q?: string;
  brand?: string[];
  category?: string[];
}

export function useProductList(params: ProductQuery, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: ['products', params],
    queryFn: ({ pageParam }) =>
      api<Page<ProductListItem>>(`/api/mobile/products${toQuery({ ...params }, pageParam)}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: HOUR,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => api<ProductCard>(`/api/mobile/products/${encodeURIComponent(slug)}`),
    staleTime: HOUR,
  });
}

export function useProductSearch(q: string) {
  return useQuery({
    queryKey: ['product-search', q],
    queryFn: () =>
      api<{ products: ProductSearchHit[] }>(`/api/products/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: HOUR,
  });
}

// --- Мутации полки: после каждой — обновляем полку и профиль ---

function useShelfMutation<TVars, TResult = unknown>(fn: (vars: TVars) => Promise<TResult>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['shelf'] }),
        client.invalidateQueries({ queryKey: ['me'] }),
      ]);
    },
  });
}

export function useAddToShelf() {
  return useShelfMutation(
    (vars: { productId: string } | { customName: string; customInci?: string }) =>
      api<{ item: { id: string } }>('/api/shelf', { body: vars }),
  );
}

export function useUpdateShelfItem() {
  return useShelfMutation(
    (vars: { id: string; status?: ShelfStatus; customName?: string; customInci?: string | null }) => {
      const { id, ...body } = vars;
      return api(`/api/shelf/${id}`, { method: 'PATCH', body });
    },
  );
}

export function useDeleteShelfItem() {
  return useShelfMutation((id: string) => api(`/api/shelf/${id}`, { method: 'DELETE' }));
}

export function useAddReaction() {
  return useShelfMutation(
    (vars: { shelfItemId: string; type: string; note?: string; occurredAt?: string }) =>
      api('/api/reactions', { body: vars }),
  );
}

export function useAddReminder() {
  return useShelfMutation((vars: { shelfItemId: string; type: ReminderKind }) =>
    api('/api/reminders', { body: vars }),
  );
}

export function useDeleteReminder() {
  return useShelfMutation((id: string) => api(`/api/reminders/${id}`, { method: 'DELETE' }));
}

export interface SkinProfileInput {
  skinType: string;
  sensitive: boolean;
  concerns: string[];
  conditions: string[];
  allergies: string[];
  intolerances: string[];
  consent: true;
}

export function useSaveSkinProfile() {
  return useShelfMutation((input: SkinProfileInput) => api('/api/skin-profile', { body: input }));
}

export function useDeleteSkinProfile() {
  return useShelfMutation(() => api('/api/skin-profile', { method: 'DELETE' }));
}

export function useReportToken() {
  return useMutation({
    mutationFn: (token: string) => api('/api/feedback', { body: { token } }),
  });
}
