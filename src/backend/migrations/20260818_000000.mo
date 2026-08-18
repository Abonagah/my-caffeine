import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type UserRole = {
    #admin;
    #user;
    #guest;
  };

  type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type Unit = {
    #kilo;
    #gram;
    #carton;
    #piece;
    #unit;
    #other;
  };

  type PaymentMethod = {
    #cash;
    #bankTransfer;
    #instapay;
    #check;
    #other;
  };

  type PaymentStatus = {
    #paid;
    #partial;
    #unpaid;
  };

  type MovementType = {
    #sale;
    #add;
    #refund;
    #adjust;
  };

  type Product = {
    id : Nat;
    name : Text;
    description : Text;
    salePrice : Float;
    purchasePrice : Float;
    quantity : Float;
    unit : Unit;
    lowStockThreshold : Float;
    isActive : Bool;
  };

  type Customer = {
    id : Nat;
    name : Text;
    phone : Text;
    address : Text;
    isActive : Bool;
  };

  type InvoiceItem = {
    productId : Nat;
    productName : Text;
    quantity : Float;
    unitPrice : Float;
    lineTotal : Float;
  };

  type Invoice = {
    id : Nat;
    customerId : Nat;
    items : [InvoiceItem];
    subtotal : Float;
    discount : Float;
    tax : Float;
    total : Float;
    paymentStatus : PaymentStatus;
    createdAt : Int;
  };

  type Payment = {
    id : Nat;
    customerId : Nat;
    invoiceId : ?Nat;
    amount : Float;
    method : PaymentMethod;
    createdAt : Int;
  };

  type InventoryMovement = {
    id : Nat;
    productId : Nat;
    movementType : MovementType;
    quantity : Float;
    createdAt : Int;
  };

  type CompanySettings = {
    companyName : Text;
    address : Text;
    phone : Text;
    taxRate : Float;
    lowStockThreshold : Float;
  };

  type SettingsState = {
    var value : CompanySettings;
  };

  type AppState = {
    var nextProductId : Nat;
    var nextCustomerId : Nat;
    var nextInvoiceId : Nat;
    var nextPaymentId : Nat;
    var nextMovementId : Nat;
  };

  type OldActor = {};

  type NewActor = {
    accessControlState : AccessControlState;
    state : AppState;
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Nat, Customer>;
    invoices : Map.Map<Nat, Invoice>;
    payments : Map.Map<Nat, Payment>;
    movements : Map.Map<Nat, InventoryMovement>;
    settings : SettingsState;
    productPermissions : Map.Map<Principal, Bool>;
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      state = {
        var nextProductId = 0;
        var nextCustomerId = 0;
        var nextInvoiceId = 0;
        var nextPaymentId = 0;
        var nextMovementId = 0;
      };
      products = Map.empty();
      customers = Map.empty();
      invoices = Map.empty();
      payments = Map.empty();
      movements = Map.empty();
      settings = {
        var value = {
          companyName = "";
          address = "";
          phone = "";
          taxRate = 0.0;
          lowStockThreshold = 0.0;
        };
      };
      productPermissions = Map.empty();
    };
  };
};
