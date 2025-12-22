import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface CurrentOrder {
  id: string;
  itemName: string;
  status: string;
  origin: string;
  destination: string;
  riskScore: number;
  progress?: number;
  estimatedArrival?: string | null;
}

export interface Truck {
  id: string;
  driverName: string;
  vehicleType: "REFRIGERATED" | "DRY_VAN" | "FLATBED" | "TANKER";
  status: "ACTIVE" | "IDLE" | "MAINTENANCE" | "INCIDENT";
  createdAt: string;
  updatedAt: string;
  currentOrder?: CurrentOrder | null;
}

interface UseTrucksReturn {
  trucks: Truck[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Truck[] | undefined>;
  updateTruck: (truckId: string, updates: Partial<Truck>) => void;
}

/**
 * SWR hook for fetching and managing trucks (fleet).
 * Provides optimistic updates via updateTruck helper.
 */
export function useTrucks(): UseTrucksReturn {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Truck[]>(
    SWR_KEYS.TRUCKS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  /**
   * Optimistically update a single truck in the cache.
   */
  const updateTruck = (truckId: string, updates: Partial<Truck>) => {
    boundMutate(
      (currentTrucks) => {
        if (!currentTrucks) return currentTrucks;
        return currentTrucks.map((truck) =>
          truck.id === truckId ? { ...truck, ...updates } : truck
        );
      },
      { revalidate: false }
    );
  };

  return {
    trucks: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    updateTruck,
  };
}

/**
 * Utility to revalidate trucks from anywhere.
 */
export function revalidateTrucks() {
  return mutate(SWR_KEYS.TRUCKS);
}

/**
 * Utility to optimistically update a truck from anywhere.
 */
export function mutateTruck(truckId: string, updates: Partial<Truck>) {
  return mutate<Truck[]>(
    SWR_KEYS.TRUCKS,
    (currentTrucks) => {
      if (!currentTrucks) return currentTrucks;
      return currentTrucks.map((truck) =>
        truck.id === truckId ? { ...truck, ...updates } : truck
      );
    },
    { revalidate: false }
  );
}
