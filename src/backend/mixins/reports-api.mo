import Int "mo:core/Int";
import Map "mo:core/Map";
import Time "mo:core/Time";
import Types "../types/common";

mixin (
  invoices : Map.Map<Nat, Types.Invoice>,
  payments : Map.Map<Nat, Types.Payment>,
  customers : Map.Map<Nat, Types.Customer>,
  products : Map.Map<Nat, Types.Product>,
) {
  transient let NS_PER_DAY = 86_400_000_000_000;

  // عدد الأيام منذ 1970-01-01 (توقيت UTC)
  func daysFromEpoch(ts : Int) : Int {
    ts / NS_PER_DAY;
  };

  // تحويل عدد الأيام إلى (سنة، شهر، يوم)
  func civilFromDays(z : Int) : (Int, Int, Int) {
    let z2 = z + 719468;
    let era = if (z2 >= 0) { z2 / 146097 } else { (z2 - 146096) / 146097 };
    let doe = z2 - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if (mp < 10) { mp + 3 } else { mp - 9 };
    (if (m <= 2) { y + 1 } else { y }, m, d);
  };

  // تحويل (سنة، شهر، يوم) إلى عدد الأيام منذ 1970-01-01
  func daysFromCivil(y : Int, m : Int, d : Int) : Int {
    let y2 = if (m <= 2) { y - 1 } else { y };
    let era = if (y2 >= 0) { y2 / 400 } else { (y2 - 399) / 400 };
    let yoe = y2 - era * 400;
    let mp = if (m > 2) { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468;
  };

  // بداية اليوم (توقيت UTC)
  func dayStart(ts : Int) : Int {
    daysFromEpoch(ts) * NS_PER_DAY;
  };

  // بداية الشهر (توقيت UTC)
  func monthStart(ts : Int) : Int {
    let (y, m, _d) = civilFromDays(daysFromEpoch(ts));
    daysFromCivil(y, m, 1) * NS_PER_DAY;
  };

  // رصيد العميل = إجمالي الفواتير - إجمالي المدفوعات
  func customerBalance(customerId : Nat) : Float {
    var invoiced = 0.0;
    for ((_id, inv) in invoices.entries()) {
      if (inv.customerId == customerId) { invoiced += inv.total };
    };
    var paid = 0.0;
    for ((_id, pay) in payments.entries()) {
      if (pay.customerId == customerId) { paid += pay.amount };
    };
    invoiced - paid;
  };

  public query func getDashboard() : async Types.Dashboard {
    let now = Time.now();
    let todayStart = dayStart(now);
    let monthStartTs = monthStart(now);

    var todaySales = 0.0;
    var monthSales = 0.0;
    for ((_id, inv) in invoices.entries()) {
      if (inv.createdAt >= todayStart) { todaySales += inv.total };
      if (inv.createdAt >= monthStartTs) { monthSales += inv.total };
    };

    var todayCollections = 0.0;
    var monthCollections = 0.0;
    for ((_id, pay) in payments.entries()) {
      if (pay.createdAt >= todayStart) { todayCollections += pay.amount };
      if (pay.createdAt >= monthStartTs) { monthCollections += pay.amount };
    };

    var totalDebts = 0.0;
    for ((_id, cust) in customers.entries()) {
      let bal = customerBalance(cust.id);
      if (bal > 0.0) { totalDebts += bal };
    };

    let lowStockProducts = products.values().toArray().filter(
      func p = p.isActive and p.quantity <= p.lowStockThreshold
    );

    let sortedInvoices = invoices.values().toArray().sort(
      func (a, b) = Int.compare(b.createdAt, a.createdAt)
    );
    let recentInvoices = if (sortedInvoices.size() > 10) {
      sortedInvoices.sliceToArray(0, 10);
    } else { sortedInvoices };

    let sortedPayments = payments.values().toArray().sort(
      func (a, b) = Int.compare(b.createdAt, a.createdAt)
    );
    let recentPayments = if (sortedPayments.size() > 10) {
      sortedPayments.sliceToArray(0, 10);
    } else { sortedPayments };

    {
      todaySales;
      monthSales;
      todayCollections;
      monthCollections;
      totalDebts;
      lowStockProducts;
      recentInvoices;
      recentPayments;
    };
  };

  public query func getSalesReport(start : Types.Timestamp, end : Types.Timestamp) : async Types.SalesReport {
    var totalSales = 0.0;
    var invoiceCount = 0;
    var itemsSold = 0.0;
    for ((_id, inv) in invoices.entries()) {
      if (inv.createdAt >= start and inv.createdAt <= end) {
        totalSales += inv.total;
        invoiceCount += 1;
        for (item in inv.items.values()) {
          itemsSold += item.quantity;
        };
      };
    };
    { totalSales; invoiceCount; itemsSold };
  };

  public query func getCollectionsReport(start : Types.Timestamp, end : Types.Timestamp) : async Types.CollectionsReport {
    var totalCollections = 0.0;
    var paymentCount = 0;
    for ((_id, pay) in payments.entries()) {
      if (pay.createdAt >= start and pay.createdAt <= end) {
        totalCollections += pay.amount;
        paymentCount += 1;
      };
    };
    { totalCollections; paymentCount };
  };

  public query func getDebtsReport() : async Types.DebtsReport {
    var totalDebts = 0.0;
    var statements : [Types.CustomerStatement] = [];
    for ((_id, cust) in customers.entries()) {
      let bal = customerBalance(cust.id);
      if (bal > 0.0) {
        totalDebts += bal;
        let custInvoices = invoices.values().toArray().filter(func inv = inv.customerId == cust.id);
        let custPayments = payments.values().toArray().filter(func pay = pay.customerId == cust.id);
        statements := statements.concat([{
          customer = cust;
          invoices = custInvoices;
          payments = custPayments;
          balance = bal;
        }]);
      };
    };
    { totalDebts; customers = statements };
  };
};
