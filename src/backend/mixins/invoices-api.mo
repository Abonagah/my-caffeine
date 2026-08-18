import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/common";

mixin (
  invoices : Map.Map<Nat, Types.Invoice>,
  products : Map.Map<Nat, Types.Product>,
  movements : Map.Map<Nat, Types.InventoryMovement>,
  state : Types.AppState,
) {
  public query func listInvoices() : async [Types.Invoice] {
    invoices.values().toArray()
  };

  public query func getInvoice(id : Nat) : async ?Types.Invoice {
    invoices.get(id)
  };

  public func createInvoice(
    customerId : Nat,
    items : [Types.InvoiceItem],
    discount : Float,
    tax : Float,
  ) : async Nat {
    let id = state.nextInvoiceId;
    state.nextInvoiceId += 1;

    var subtotal = 0.0;
    for (item in items.values()) {
      subtotal += item.lineTotal;
    };
    let total = subtotal - discount + tax;

    let invoice : Types.Invoice = {
      id;
      customerId;
      items;
      subtotal;
      discount;
      tax;
      total;
      paymentStatus = #unpaid;
      createdAt = Time.now();
    };
    invoices.add(id, invoice);

    // خصم الكمية من المخزون عند البيع
    applySale(items);

    id;
  };

  public func updateInvoice(
    id : Nat,
    customerId : Nat,
    items : [Types.InvoiceItem],
    discount : Float,
    tax : Float,
  ) : async () {
    switch (invoices.get(id)) {
      case (?old) {
        // إرجاع أثر البنود القديمة على المخزون ثم تطبيق الجديدة
        applyRefund(old.items);
        applySale(items);

        var subtotal = 0.0;
        for (item in items.values()) {
          subtotal += item.lineTotal;
        };
        let total = subtotal - discount + tax;

        let updated : Types.Invoice = {
          id;
          customerId;
          items;
          subtotal;
          discount;
          tax;
          total;
          paymentStatus = old.paymentStatus;
          createdAt = old.createdAt;
        };
        invoices.add(id, updated);
      };
      case null {};
    };
  };

  public func deleteInvoice(id : Nat) : async () {
    switch (invoices.get(id)) {
      case (?old) {
        // إرجاع الكمية إلى المخزون عند حذف الفاتورة
        applyRefund(old.items);
        invoices.remove(id);
      };
      case null {};
    };
  };

  // خصم الكمية من المخزون عند البيع وتسجيل حركة المخزون
  func applySale(items : [Types.InvoiceItem]) {
    for (item in items.values()) {
      switch (products.get(item.productId)) {
        case (?p) {
          products.add(item.productId, { p with quantity = p.quantity - item.quantity });
        };
        case null {};
      };
      let mid = state.nextMovementId;
      state.nextMovementId += 1;
      movements.add(mid, {
        id = mid;
        productId = item.productId;
        movementType = #sale;
        quantity = item.quantity;
        createdAt = Time.now();
      });
    };
  };

  // إرجاع الكمية إلى المخزون عند المرتجع وتسجيل حركة المخزون
  func applyRefund(items : [Types.InvoiceItem]) {
    for (item in items.values()) {
      switch (products.get(item.productId)) {
        case (?p) {
          products.add(item.productId, { p with quantity = p.quantity + item.quantity });
        };
        case null {};
      };
      let mid = state.nextMovementId;
      state.nextMovementId += 1;
      movements.add(mid, {
        id = mid;
        productId = item.productId;
        movementType = #refund;
        quantity = item.quantity;
        createdAt = Time.now();
      });
    };
  };
};
