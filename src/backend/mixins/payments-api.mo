import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/common";

mixin (
  payments : Map.Map<Nat, Types.Payment>,
  invoices : Map.Map<Nat, Types.Invoice>,
  state : Types.AppState,
) {
  public query func listPayments() : async [Types.Payment] {
    payments.values().toArray()
  };

  public func addPayment(
    customerId : Nat,
    invoiceId : ?Nat,
    amount : Float,
    method : Types.PaymentMethod,
  ) : async Nat {
    let id = state.nextPaymentId;
    state.nextPaymentId += 1;

    let payment : Types.Payment = {
      id;
      customerId;
      invoiceId;
      amount;
      method;
      createdAt = Time.now();
    };
    payments.add(id, payment);

    // تحديث حالة دفع الفاتورة تلقائيًا من المدفوعات
    switch (invoiceId) {
      case (?invId) {
        switch (invoices.get(invId)) {
          case (?inv) {
            var paid = 0.0;
            for ((_, p) in payments.entries()) {
              switch (p.invoiceId) {
                case (?pid) { if (pid == invId) { paid += p.amount } };
                case null {};
              };
            };
            let status = if (paid >= inv.total) { #paid }
              else if (paid > 0.0) { #partial }
              else { #unpaid };
            invoices.add(invId, { inv with paymentStatus = status });
          };
          case null {};
        };
      };
      case null {};
    };

    id;
  };
};
