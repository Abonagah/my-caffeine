import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Types "../types/common";

mixin (
  customers : Map.Map<Nat, Types.Customer>,
  invoices : Map.Map<Nat, Types.Invoice>,
  payments : Map.Map<Nat, Types.Payment>,
  state : Types.AppState,
) {
  public query func listCustomers() : async [Types.Customer] {
    customers.values().toArray()
  };

  public query func getCustomer(id : Nat) : async ?Types.Customer {
    customers.get(id)
  };

  public query func getCustomerStatement(id : Nat) : async Types.CustomerStatement {
    let customer = customers.get(id) ?? Runtime.trap("العميل غير موجود");
    let customerInvoices = invoices.values().toArray().filter(func inv = inv.customerId == id);
    let customerPayments = payments.values().toArray().filter(func p = p.customerId == id);
    var totalInvoices = 0.0;
    for (inv in customerInvoices.values()) {
      totalInvoices += inv.total;
    };
    var totalPayments = 0.0;
    for (p in customerPayments.values()) {
      totalPayments += p.amount;
    };
    {
      customer;
      invoices = customerInvoices;
      payments = customerPayments;
      balance = totalInvoices - totalPayments;
    }
  };

  public func addCustomer(name : Text, phone : Text, address : Text) : async Nat {
    let id = state.nextCustomerId;
    state.nextCustomerId += 1;
    customers.add(id, { id; name; phone; address; isActive = true });
    id
  };

  public func updateCustomer(id : Nat, name : Text, phone : Text, address : Text) : async () {
    switch (customers.get(id)) {
      case (?c) {
        customers.add(id, { c with name; phone; address; isActive = true });
      };
      case null { Runtime.trap("العميل غير موجود") };
    };
  };

  public func deactivateCustomer(id : Nat) : async () {
    switch (customers.get(id)) {
      case (?c) {
        customers.add(id, { c with isActive = false });
      };
      case null { Runtime.trap("العميل غير موجود") };
    };
  };

  public func deleteCustomer(id : Nat) : async () {
    let used = invoices.any(func (_, inv) = inv.customerId == id);
    if (used) {
      Runtime.trap("لا يمكن حذف عميل لديه فواتير");
    };
    customers.remove(id);
  };
};
