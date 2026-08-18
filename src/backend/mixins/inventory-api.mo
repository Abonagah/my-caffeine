import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/common";

mixin (
  movements : Map.Map<Nat, Types.InventoryMovement>,
  products : Map.Map<Nat, Types.Product>,
  state : Types.AppState,
) {
  public query func listInventory() : async [Types.InventoryMovement] {
    movements.values().toArray()
  };

  public query func getLowStockProducts() : async [Types.Product] {
    products.values().toArray().filter(func p = p.quantity < p.lowStockThreshold)
  };

  // Primitive operation the composition root / invoices mixin calls to update
  // inventory from invoice operations: decrement on sale, increment on add/refund.
  public func recordMovement(
    productId : Nat,
    movementType : Types.MovementType,
    quantity : Float,
  ) : async () {
    let id = state.nextMovementId;
    state.nextMovementId += 1;
    movements.add(id, {
      id;
      productId;
      movementType;
      quantity;
      createdAt = Time.now();
    });
    switch (products.get(productId)) {
      case (?p) {
        let newQty = switch (movementType) {
          case (#sale) { p.quantity - quantity };
          case (#add) { p.quantity + quantity };
          case (#refund) { p.quantity + quantity };
          case (#adjust) { quantity };
        };
        products.add(productId, { p with quantity = newQty });
      };
      case null {};
    };
  };
};
