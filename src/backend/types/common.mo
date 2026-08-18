module {
  // Time in nanoseconds since epoch (Time.now()).
  public type Timestamp = Int;

  // وحدة البيع القابلة للتكوين لكل منتج
  public type Unit = {
    #kilo; // كيلو
    #gram; // جرام
    #carton; // كرتونة
    #piece; // قطعة
    #unit; // وحدة
    #other; // أخرى
  };

  // طرق الدفع
  public type PaymentMethod = {
    #cash; // نقدي
    #bankTransfer; // تحويل بنكي
    #instapay; // إنستاباي
    #check; // شيك
    #other; // أخرى
  };

  // حالة دفع الفاتورة
  public type PaymentStatus = {
    #paid; // مدفوعة
    #partial; // جزئية
    #unpaid; // غير مدفوعة
  };

  // نوع حركة المخزون
  public type MovementType = {
    #sale; // بيع
    #add; // إضافة
    #refund; // مرتجع
    #adjust; // تعديل
  };

  public type Product = {
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

  public type Customer = {
    id : Nat;
    name : Text;
    phone : Text;
    address : Text;
    isActive : Bool;
  };

  public type InvoiceItem = {
    productId : Nat;
    productName : Text;
    quantity : Float;
    unitPrice : Float;
    lineTotal : Float;
  };

  public type Invoice = {
    id : Nat;
    customerId : Nat;
    items : [InvoiceItem];
    subtotal : Float;
    discount : Float;
    tax : Float;
    total : Float;
    paymentStatus : PaymentStatus;
    createdAt : Timestamp;
  };

  public type Payment = {
    id : Nat;
    customerId : Nat;
    invoiceId : ?Nat;
    amount : Float;
    method : PaymentMethod;
    createdAt : Timestamp;
  };

  public type InventoryMovement = {
    id : Nat;
    productId : Nat;
    movementType : MovementType;
    quantity : Float;
    createdAt : Timestamp;
  };

  public type CompanySettings = {
    companyName : Text;
    address : Text;
    phone : Text;
    taxRate : Float;
    lowStockThreshold : Float;
  };

  // حاوية الإعدادات القابلة للتعديل (تُمرر للميكسينات لتحديث القيم)
  public type SettingsState = {
    var value : CompanySettings;
  };

  // عدادات معرفات مشتركة بين المجالات
  public type AppState = {
    var nextProductId : Nat;
    var nextCustomerId : Nat;
    var nextInvoiceId : Nat;
    var nextPaymentId : Nat;
    var nextMovementId : Nat;
  };

  // كشف حساب العميل
  public type CustomerStatement = {
    customer : Customer;
    invoices : [Invoice];
    payments : [Payment];
    balance : Float;
  };

  // لوحة التحكم الرئيسية
  public type Dashboard = {
    todaySales : Float;
    monthSales : Float;
    todayCollections : Float;
    monthCollections : Float;
    totalDebts : Float;
    lowStockProducts : [Product];
    recentInvoices : [Invoice];
    recentPayments : [Payment];
  };

  public type SalesReport = {
    totalSales : Float;
    invoiceCount : Nat;
    itemsSold : Float;
  };

  public type CollectionsReport = {
    totalCollections : Float;
    paymentCount : Nat;
  };

  public type DebtsReport = {
    totalDebts : Float;
    customers : [CustomerStatement];
  };
};
