import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks';
import { invitationsApi } from '../api/invitationsApi';
import type {
  CancelInvitationResultDto,
  GetPendingInvitationsFilter,
  PendingInvitationDto,
  ResendInvitationResultDto,
} from '../types/invitation.types';

const PAGE_SIZE = 20;

export function usePendingInvitations(initial: GetPendingInvitationsFilter = {}) {
  const { tenantId, departmentId } = initial;

  const [items, setItems] = useState<PendingInvitationDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageNumber, setPageNumber] = useState(initial.pageNumber ?? 1);
  const [searchTerm, setSearchTermState] = useState(initial.searchTerm ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm);

  // Only the most recent request may write state, so an abandoned page/search can't overwrite a newer one.
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await invitationsApi.getPending({
        tenantId,
        departmentId,
        searchTerm: debouncedSearch,
        pageNumber,
        pageSize: PAGE_SIZE,
      });
      if (id !== requestId.current) return;
      setItems(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (e) {
      if (id !== requestId.current) return;
      setError((e as Error).message);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [tenantId, departmentId, debouncedSearch, pageNumber]);

  useEffect(() => {
    // While a debounce is pending, wait: the fetch that carries the new term is the only one we want.
    if (searchTerm !== debouncedSearch) return;
    void load();
  }, [load, searchTerm, debouncedSearch]);

  // A new search term invalidates the current page position.
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
    setPageNumber(1);
  }, []);

  const resend = useCallback(
    async (userId: string): Promise<ResendInvitationResultDto> => {
      try {
        const result = await invitationsApi.resend(userId);
        await load();
        return result;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    [load],
  );

  const cancel = useCallback(
    async (userId: string): Promise<CancelInvitationResultDto> => {
      try {
        const result = await invitationsApi.cancel(userId);
        if (items.length === 1 && pageNumber > 1) {
          // The page change re-triggers the load effect.
          setPageNumber(pageNumber - 1);
        } else {
          await load();
        }
        return result;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      }
    },
    [load, items.length, pageNumber],
  );

  return {
    items,
    totalCount,
    pageNumber,
    totalPages,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    setPageNumber,
    reload: load,
    resend,
    cancel,
  };
}
