import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface InvoiceItem {
    lineTotal: number;
    productId: bigint;
    productName: string;
    quantity: number;
    unitPrice: number;
}
export type Timestamp = bigint;
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface Payment {
    id: bigint;
    method: PaymentMethod;
    createdAt: Timestamp;
    invoiceId?: bigint;
    customerId: bigint;
    amount: number;
}
export interface Invoice {
    id: bigint;
    tax: number;
    total: number;
    paymentStatus: PaymentStatus;
    createdAt: Timestamp;
    discount: number;
    customerId: bigint;
    items: Array<InvoiceItem>;
    subtotal: number;
}
export interface CustomerStatement {
    balance: number;
    payments: Array<Payment>;
    customer: Customer;
    invoices: Array<Invoice>;
}
export interface Customer {
    id: bigint;
    name: string;
    isActive: boolean;
    address: string;
    phone: string;
}
export interface CollectionsReport {
    totalCollections: number;
    paymentCount: bigint;
}
export interface InventoryMovement {
    id: bigint;
    createdAt: Timestamp;
    productId: bigint;
    movementType: MovementType;
    quantity: number;
}
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export interface SalesReport {
    invoiceCount: bigint;
    totalSales: number;
    itemsSold: number;
}
export interface DebtsReport {
    totalDebts: number;
    customers: Array<CustomerStatement>;
}
export interface Cell {
    value: Value;
    name: string;
}
export interface Dashboard {
    todaySales: number;
    recentInvoices: Array<Invoice>;
    monthSales: number;
    lowStockProducts: Array<Product>;
    monthCollections: number;
    todayCollections: number;
    recentPayments: Array<Payment>;
    totalDebts: number;
}
export interface CompanySettings {
    lowStockThreshold: number;
    address: string;
    companyName: string;
    phone: string;
    taxRate: number;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export interface Product {
    id: bigint;
    purchasePrice: number;
    lowStockThreshold: number;
    name: string;
    unit: Unit;
    description: string;
    isActive: boolean;
    quantity: number;
    salePrice: number;
}
export enum MovementType {
    add = "add",
    sale = "sale",
    adjust = "adjust",
    refund = "refund"
}
export enum PaymentMethod {
    other = "other",
    cash = "cash",
    check = "check",
    instapay = "instapay",
    bankTransfer = "bankTransfer"
}
export enum PaymentStatus {
    paid = "paid",
    unpaid = "unpaid",
    partial = "partial"
}
export enum Unit {
    other = "other",
    gram = "gram",
    kilo = "kilo",
    unit = "unit",
    carton = "carton",
    piece = "piece"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addCustomer(name: string, phone: string, address: string): Promise<bigint>;
    addPayment(customerId: bigint, invoiceId: bigint | null, amount: number, method: PaymentMethod): Promise<bigint>;
    addProduct(name: string, description: string, salePrice: number, purchasePrice: number, quantity: number, unit: Unit, lowStockThreshold: number): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    canManageProducts(): Promise<boolean>;
    createInvoice(customerId: bigint, items: Array<InvoiceItem>, discount: number, tax: number): Promise<bigint>;
    deactivateCustomer(id: bigint): Promise<void>;
    deactivateProduct(id: bigint): Promise<void>;
    deleteCustomer(id: bigint): Promise<void>;
    deleteInvoice(id: bigint): Promise<void>;
    deleteProduct(id: bigint): Promise<void>;
    execute(qJson: string): Promise<Result>;
    getCallerUserRole(): Promise<UserRole>;
    getCollectionsReport(start: Timestamp, end: Timestamp): Promise<CollectionsReport>;
    getCustomer(id: bigint): Promise<Customer | null>;
    getCustomerStatement(id: bigint): Promise<CustomerStatement>;
    getDashboard(): Promise<Dashboard>;
    getDebtsReport(): Promise<DebtsReport>;
    getInvoice(id: bigint): Promise<Invoice | null>;
    getLowStockProducts(): Promise<Array<Product>>;
    getProduct(id: bigint): Promise<Product | null>;
    getSalesReport(start: Timestamp, end: Timestamp): Promise<SalesReport>;
    getSettings(): Promise<CompanySettings>;
    grantProductPermission(user: Principal): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    listCustomers(): Promise<Array<Customer>>;
    listInventory(): Promise<Array<InventoryMovement>>;
    listInvoices(): Promise<Array<Invoice>>;
    listPayments(): Promise<Array<Payment>>;
    listProducts(): Promise<Array<Product>>;
    recordMovement(productId: bigint, movementType: MovementType, quantity: number): Promise<void>;
    revokeProductPermission(user: Principal): Promise<void>;
    schema(): Promise<string>;
    updateCustomer(id: bigint, name: string, phone: string, address: string): Promise<void>;
    updateInvoice(id: bigint, customerId: bigint, items: Array<InvoiceItem>, discount: number, tax: number): Promise<void>;
    updateProduct(id: bigint, name: string, description: string, salePrice: number, purchasePrice: number, quantity: number, unit: Unit, lowStockThreshold: number): Promise<void>;
    updateSettings(companyName: string, address: string, phone: string, taxRate: number, lowStockThreshold: number): Promise<void>;
}
