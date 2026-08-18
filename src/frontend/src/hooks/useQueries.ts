import { createActor } from "@/backend";
import type {
  InventoryMovement,
  MovementType,
  Product,
  UserRole,
} from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Returns the current caller's role (admin / user / guest).
 * The first authenticated user to log in automatically becomes admin.
 */
export function useCallerRole() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<UserRole>({
    queryKey: ["callerRole"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Whether the current caller can manage products (admin or granted permission). */
export function useCanManageProducts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["canManageProducts"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.canManageProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Whether the current caller is an admin. */
export function useIsAdmin() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

/** All products with their current stock levels. */
export function useProducts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

/** The full inventory movement history (سجل حركة المخزون). */
export function useInventory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<InventoryMovement[]>({
    queryKey: ["inventory"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listInventory();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Products whose current quantity is below their low-stock threshold. */
export function useLowStockProducts() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<Product[]>({
    queryKey: ["lowStockProducts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLowStockProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

/** Records a manual inventory movement (e.g. adding stock). */
export function useRecordMovement() {
  const { actor } = useActor(createActor);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      productId: bigint;
      movementType: MovementType;
      quantity: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.recordMovement(
        args.productId,
        args.movementType,
        args.quantity,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["lowStockProducts"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
