import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import Types "../types/common";

mixin (
  products : Map.Map<Nat, Types.Product>,
  invoices : Map.Map<Nat, Types.Invoice>,
  state : Types.AppState,
  accessControlState : AccessControl.AccessControlState,
  productPermissions : Map.Map<Principal, Bool>,
) {
  public query func listProducts() : async [Types.Product] {
    products.values().toArray()
  };

  public query func getProduct(id : Nat) : async ?Types.Product {
    products.get(id)
  };

  public func addProduct(
    name : Text,
    description : Text,
    salePrice : Float,
    purchasePrice : Float,
    quantity : Float,
    unit : Types.Unit,
    lowStockThreshold : Float,
  ) : async Nat {
    let id = state.nextProductId;
    state.nextProductId += 1;
    products.add(id, {
      id;
      name;
      description;
      salePrice;
      purchasePrice;
      quantity;
      unit;
      lowStockThreshold;
      isActive = true;
    });
    id
  };

  public func updateProduct(
    id : Nat,
    name : Text,
    description : Text,
    salePrice : Float,
    purchasePrice : Float,
    quantity : Float,
    unit : Types.Unit,
    lowStockThreshold : Float,
  ) : async () {
    switch (products.get(id)) {
      case (?p) {
        products.add(id, {
          p with
          name = name;
          description = description;
          salePrice = salePrice;
          purchasePrice = purchasePrice;
          quantity = quantity;
          unit = unit;
          lowStockThreshold = lowStockThreshold;
          isActive = true;
        });
      };
      case null {};
    };
  };

  public func deactivateProduct(id : Nat) : async () {
    switch (products.get(id)) {
      case (?p) {
        products.add(id, { p with isActive = false });
      };
      case null {};
    };
  };

  public func deleteProduct(id : Nat) : async () {
    // Hard delete only for products never used in any invoice, so old
    // invoices stay intact. Deactivated products are hidden from new invoices.
    let usedInInvoice = invoices.toArray().any(
      func (_, inv) = inv.items.any(func item = item.productId == id)
    );
    if (not usedInInvoice) {
      products.remove(id);
    };
  };

  // ---- صلاحيات إدارة المنتجات لكل موظف ----

  // هل يستطيع المتصل إدارة المنتجات (إضافة/تعديل/حذف)؟
  public query ({ caller }) func canManageProducts() : async Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      true
    } else {
      productPermissions.get(caller) ?? false
    };
  };

  // منح صلاحية إدارة المنتجات لموظف (للأدمن فقط)
  public shared ({ caller }) func grantProductPermission(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("غير مصرح: الأدمن فقط يمكنه منح الصلاحيات");
    };
    productPermissions.add(user, true);
  };

  // سحب صلاحية إدارة المنتجات من موظف (للأدمن فقط)
  public shared ({ caller }) func revokeProductPermission(user : Principal) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("غير مصرح: الأدمن فقط يمكنه سحب الصلاحيات");
    };
    productPermissions.remove(user);
  };
};
