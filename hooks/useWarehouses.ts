import useSWR from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface Warehouse {
  id: string;
  name: string;
  type: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  description?: string | null;
}

interface UseWarehousesReturn {
  warehouses: Warehouse[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Warehouse[] | undefined>;
}

/**
 * SWR hook for fetching warehouses.
 * Warehouses are relatively static, so we use longer cache times.
 */
export function useWarehouses(): UseWarehousesReturn {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Warehouse[]>(
    SWR_KEYS.WAREHOUSES,
    fetcher,
    {
      revalidateOnFocus: false, // Warehouses don't change often
      dedupingInterval: 60000, // 1 minute deduplication
      revalidateIfStale: false,
    }
  );

  return {
    warehouses: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
  };
}
