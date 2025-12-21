import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface Truck {
  id: string;
  driverName: string;
  vehicleType: string;
  status: string;
}

export interface Buyer {
  id: string;
  name: string;
  segment: string;
  trustScore: number;
  totalSpend: number;
}

export interface Order {
  id: string;
  itemName: string;
  description?: string | null;
  orderValue?: number;
  status: string;
  carrier: string;
  truckId?: string | null;
  truck?: Truck | null;
  origin: string;
  destination: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  riskScore: number;
  routeGeoJson?: number[][] | null;
  distanceMeters?: number;
  durationSeconds?: number;
  progress?: number;
  departedAt?: string | null;
  estimatedArrival?: string | null;
  actualArrival?: string | null;
  costPrice?: number;
  sellPrice?: number;
  internalBaseCost?: number;
  actualLogisticsCost?: number;
  buyers?: Buyer[];
  createdAt: string;
  updatedAt: string;
}

interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Order[] | undefined>;
  updateOrder: (orderId: string, updates: Partial<Order>) => void;
  addOrder: (order: Order) => void;
}

/**
 * SWR hook for fetching and managing orders.
 * Provides optimistic updates via updateOrder and addOrder helpers.
 */
export function useOrders(): UseOrdersReturn {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Order[]>(
    SWR_KEYS.ORDERS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 5000,
    }
  );

  /**
   * Optimistically update a single order in the cache.
   * Use this instead of full refetch for Pusher events.
   */
  const updateOrder = (orderId: string, updates: Partial<Order>) => {
    boundMutate(
      (currentOrders) => {
        if (!currentOrders) return currentOrders;
        return currentOrders.map((order) =>
          order.id === orderId ? { ...order, ...updates } : order
        );
      },
      { revalidate: false }
    );
  };

  /**
   * Optimistically add an order to the cache.
   * Merges if order already exists.
   */
  const addOrder = (order: Order) => {
    boundMutate(
      (currentOrders) => {
        if (!currentOrders) return [order];
        const exists = currentOrders.find((o) => o.id === order.id);
        if (exists) {
          return currentOrders.map((o) =>
            o.id === order.id ? { ...o, ...order } : o
          );
        }
        return [...currentOrders, order];
      },
      { revalidate: false }
    );
  };

  return {
    orders: data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    updateOrder,
    addOrder,
  };
}

/**
 * Utility to revalidate orders from anywhere (e.g., Pusher handlers).
 * Triggers a refetch of the orders cache.
 */
export function revalidateOrders() {
  return mutate(SWR_KEYS.ORDERS);
}

/**
 * Utility to optimistically update an order from anywhere.
 * Useful in Pusher event handlers.
 */
export function mutateOrder(orderId: string, updates: Partial<Order>) {
  return mutate<Order[]>(
    SWR_KEYS.ORDERS,
    (currentOrders) => {
      if (!currentOrders) return currentOrders;
      return currentOrders.map((order) =>
        order.id === orderId ? { ...order, ...updates } : order
      );
    },
    { revalidate: false }
  );
}
