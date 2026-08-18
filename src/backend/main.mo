import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "types/common";
import ProductsApi "mixins/products-api";
import CustomersApi "mixins/customers-api";
import InvoicesApi "mixins/invoices-api";
import PaymentsApi "mixins/payments-api";
import InventoryApi "mixins/inventory-api";
import ReportsApi "mixins/reports-api";
import SettingsApi "mixins/settings-api";
import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import MapEntity "mo:caffeineai-oql/MapEntity";
import Entity "mo:caffeineai-oql/Entity";
import RecordValue "mo:caffeineai-oql/RecordValue";
import NatValue "mo:caffeineai-oql/NatValue";
import TextValue "mo:caffeineai-oql/TextValue";
import BoolValue "mo:caffeineai-oql/BoolValue";
import FloatValue "mo:caffeineai-oql/FloatValue";
import IntValue "mo:caffeineai-oql/IntValue";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let state : Types.AppState;
  let products : Map.Map<Nat, Types.Product>;
  let customers : Map.Map<Nat, Types.Customer>;
  let invoices : Map.Map<Nat, Types.Invoice>;
  let payments : Map.Map<Nat, Types.Payment>;
  let movements : Map.Map<Nat, Types.InventoryMovement>;
  let settings : Types.SettingsState;
  let productPermissions : Map.Map<Principal, Bool>;

  include ProductsApi(products, invoices, state, accessControlState, productPermissions);
  include CustomersApi(customers, invoices, payments, state);
  include InvoicesApi(invoices, products, movements, state);
  include PaymentsApi(payments, invoices, state);
  include InventoryApi(movements, products, state);
  include ReportsApi(invoices, payments, customers, products);
  include SettingsApi(settings);

  // ---- OQL variant-to-text conversions (manual payload helpers) ----
  func unitToText(u : Types.Unit) : Text {
    switch u {
      case (#kilo) "kilo";
      case (#gram) "gram";
      case (#carton) "carton";
      case (#piece) "piece";
      case (#unit) "unit";
      case (#other) "other";
    };
  };

  func statusToText(s : Types.PaymentStatus) : Text {
    switch s {
      case (#paid) "paid";
      case (#partial) "partial";
      case (#unpaid) "unpaid";
    };
  };

  func methodToText(m : Types.PaymentMethod) : Text {
    switch m {
      case (#cash) "cash";
      case (#bankTransfer) "bankTransfer";
      case (#instapay) "instapay";
      case (#check) "check";
      case (#other) "other";
    };
  };

  func movementTypeToText(m : Types.MovementType) : Text {
    switch m {
      case (#sale) "sale";
      case (#add) "add";
      case (#refund) "refund";
      case (#adjust) "adjust";
    };
  };

  func invoiceIdToText(id : ?Nat) : Text {
    switch id {
      case (?n) n.toText();
      case null "";
    };
  };

  include Expose({
    entities = [
      // المنتجات — بيانات خاصة تُقرأ عبر وكيل البيانات
      products.toEntityManual("product", "Product", "id")
        .payload("id", func p = p.id)
        .payload("name", func p = p.name)
        .payload("description", func p = p.description)
        .payload("salePrice", func p = p.salePrice)
        .payload("purchasePrice", func p = p.purchasePrice)
        .payload("quantity", func p = p.quantity)
        .payload("unit", func p = unitToText(p.unit))
        .payload("lowStockThreshold", func p = p.lowStockThreshold)
        .payload("isActive", func p = p.isActive)
        .controllerOnly()
        .build(),

      // العملاء — بيانات خاصة
      customers.toEntity("customer", "Customer", "id")
        .sample({ id = 0; name = ""; phone = ""; address = ""; isActive = true })
        .controllerOnly()
        .build(),

      // الفواتير — بيانات خاصة، مع ربط العميل
      invoices.toEntityManual("invoice", "Invoice", "id")
        .payload("id", func i = i.id)
        .payload("customerId", func i = i.customerId)
        .edge("customerId", "customer")
        .payload("itemCount", func i = i.items.size())
        .payload("subtotal", func i = i.subtotal)
        .payload("discount", func i = i.discount)
        .payload("tax", func i = i.tax)
        .payload("total", func i = i.total)
        .payload("paymentStatus", func i = statusToText(i.paymentStatus))
        .payload("createdAt", func i = i.createdAt)
        .controllerOnly()
        .build(),

      // المدفوعات — بيانات خاصة، مع ربط العميل والفاتورة
      payments.toEntityManual("payment", "Payment", "id")
        .payload("id", func p = p.id)
        .payload("customerId", func p = p.customerId)
        .edge("customerId", "customer")
        .payload("invoiceId", func p = invoiceIdToText(p.invoiceId))
        .payload("amount", func p = p.amount)
        .payload("method", func p = methodToText(p.method))
        .payload("createdAt", func p = p.createdAt)
        .controllerOnly()
        .build(),

      // حركات المخزون — بيانات خاصة، مع ربط المنتج
      movements.toEntityManual("inventoryMovement", "InventoryMovement", "id")
        .payload("id", func m = m.id)
        .payload("productId", func m = m.productId)
        .edge("productId", "product")
        .payload("movementType", func m = movementTypeToText(m.movementType))
        .payload("quantity", func m = m.quantity)
        .payload("createdAt", func m = m.createdAt)
        .controllerOnly()
        .build(),
    ];
  });
};
