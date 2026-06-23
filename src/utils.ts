import { Invoice, Supplier, InvoiceStatus, P2PSettings, OutgoingEmailLog } from "./types";

// Base timestamp for simulation: 2026-06-22
export const SIMULATED_TODAY = "2026-06-22";

export const DEFAULT_SETTINGS: P2PSettings = {
  companyName: "Acme Logistics Singapore Pte Ltd",
  financeTeamEmail: "ap.team@acmelogistics.sg",
  defaultPayNowUEN: "201829944D01",
  defaultBankRoute: "DBS Bank Sg (Account 012-34567-8)",
  defaultBankAccount: "012345678",
  preDueRemindDays: 3,
};

export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: "sup_1",
    name: "Singtel Enterprise Ltd",
    uen: "199201234K",
    email: "billing@singtel.com",
    paymentAccountAddress: "DBS Corporate 003-91234-5",
    paymentTermDays: 30,
    contactPerson: "Mr Tan Chin Han",
    isStrategic: true,
  },
  {
    id: "sup_2",
    name: "Keppel Electric Pte Ltd",
    uen: "201509876H",
    email: "finance@keppelelectric.com.sg",
    paymentAccountAddress: "UOB Account 110-3456-222",
    paymentTermDays: 14,
    contactPerson: "Ms Clara Lim",
    isStrategic: false,
  },
  {
    id: "sup_3",
    name: "Sheng Siong Supermarket",
    uen: "201002030E",
    email: "ap@shengsiong.com.sg",
    paymentAccountAddress: "OCBC Corporate 410-12342-9",
    paymentTermDays: 14,
    contactPerson: "Mr Lim Ah Seng",
    isStrategic: false,
  },
  {
    id: "sup_4",
    name: "A-Star Logistics Consulting",
    uen: "201911999W",
    email: "accounts@astarconsulting.sg",
    paymentAccountAddress: "PayNow UEN 201911999W",
    paymentTermDays: 30,
    contactPerson: "Dr S. Kumar",
    isStrategic: true,
  },
  {
    id: "sup_5",
    name: "Singapore Customs",
    uen: "GOVT00938A",
    email: "duty-payment@customs.gov.sg",
    paymentAccountAddress: "Direct Debit (GIRO Sg)",
    paymentTermDays: 7,
    contactPerson: "Officer Razali",
    isStrategic: true,
  }
];

export const SEED_INVOICES: Invoice[] = [
  {
    id: "inv_1",
    invoiceNumber: "SI-2026-6102",
    supplierId: "sup_1",
    issueDate: "2026-05-15",
    dueDate: "2026-06-14", // OVERDUE relative to June 22
    totalAmountSgd: 1450.80,
    status: InvoiceStatus.OVERDUE,
    matchedPurchaseOrder: "PO-450011",
    description: "Cloud Hosting Bandwidth Premium Support for SG regional office",
    items: [
      { id: "item_1_1", description: "Singtel Fiber Broadband 1Gbps Dedicated", qty: 1, rate: 850.00, amount: 850.00 },
      { id: "item_1_2", description: "IP Transit Security Suite Sg Office", qty: 1, rate: 500.00, amount: 500.00 },
      { id: "item_1_3", description: "Sg Local GST (9%)", qty: 1, rate: 100.80, amount: 100.80 }
    ],
    remindedCount: 2,
    lastRemindedDate: "2026-06-16 10:15"
  },
  {
    id: "inv_2",
    invoiceNumber: "KE-MAY-8893",
    supplierId: "sup_2",
    issueDate: "2026-05-28",
    dueDate: "2026-06-11", // OVERDUE relative to June 22
    totalAmountSgd: 3840.40,
    status: InvoiceStatus.OVERDUE,
    matchedPurchaseOrder: "PO-450123",
    description: "Keppel Grid Power Electricity billing period 01-May-2026 to 28-May-2026",
    items: [
      { id: "item_2_1", description: "Grid Power Commercial Tariff Peak Usage (kWh)", qty: 12000, rate: 0.292, amount: 3504.00 },
      { id: "item_2_2", description: "Grid Administrative Levy & Carbon tax", qty: 1, rate: 336.40, amount: 336.40 }
    ],
    remindedCount: 0
  },
  {
    id: "inv_3",
    invoiceNumber: "SS-OFFICE-4422",
    supplierId: "sup_3",
    issueDate: "2026-06-10",
    dueDate: "2026-06-24", // DUE THIS WEEK (June 24 is in 2 days from June 22)
    totalAmountSgd: 345.90,
    status: InvoiceStatus.UNPAID,
    matchedPurchaseOrder: "PO-OFFSET-901",
    description: "Corporate pantry supplies, local fruits, beverages and cleaning staples",
    items: [
      { id: "item_3_1", description: "Pantry Staples Coffee, tea, milk catering", qty: 15, rate: 12.00, amount: 180.00 },
      { id: "item_3_2", description: "Office Cleaning Sanitization Disinfectant Supplies", qty: 12, rate: 13.825, amount: 165.90 }
    ],
    remindedCount: 0
  },
  {
    id: "inv_4",
    invoiceNumber: "AST-2026-041",
    supplierId: "sup_4",
    issueDate: "2026-06-01",
    dueDate: "2026-07-01", // UNPAID - due soon, in ~9 days
    totalAmountSgd: 12000.00,
    status: InvoiceStatus.UNPAID,
    matchedPurchaseOrder: "PO-450304",
    description: "Q2 Logistics optimization service retainer milestone fee",
    items: [
      { id: "item_4_1", description: "Warehousing Workflow optimization Consulting retainer", qty: 1, rate: 12000.00, amount: 12000.00 }
    ],
    remindedCount: 0
  },
  {
    id: "inv_5",
    invoiceNumber: "SG-CUST-TRD-4940",
    supplierId: "sup_5",
    issueDate: "2026-06-18",
    dueDate: "2026-06-25", // DUE THIS WEEK
    totalAmountSgd: 5850.00,
    status: InvoiceStatus.UNPAID,
    matchedPurchaseOrder: "PO-GIRO-TR-2",
    description: "Import clearance fees and excise duties for cargo batch A-239",
    items: [
      { id: "item_5_1", description: "Excise duty clearance fee (Customs Form-2)", qty: 1, rate: 5850.00, amount: 5850.00 }
    ],
    remindedCount: 0
  },
  {
    id: "inv_6",
    invoiceNumber: "SI-2026-6204",
    supplierId: "sup_1",
    issueDate: "2026-05-01",
    dueDate: "2026-05-31", // PAID on time
    totalAmountSgd: 1230.50,
    status: InvoiceStatus.PAID,
    matchedPurchaseOrder: "PO-450011",
    description: "Cloud Web Portal Integration Maintenance Contract May 2026",
    items: [
      { id: "item_6_1", description: "Web Server Maintenance SLA Support May", qty: 1, rate: 1230.50, amount: 1230.50 }
    ],
    remindedCount: 1,
    lastRemindedDate: "2026-05-25 09:00"
  }
];

export const SEED_EMAIL_LOGS: OutgoingEmailLog[] = [
  {
    id: "log_1",
    timestamp: "2026-06-16 10:15",
    invoiceNumber: "SI-2026-6102",
    supplierName: "Singtel Enterprise Ltd",
    recipientEmail: "ap.team@acmelogistics.sg",
    subject: "‼️ URGENT: Singtel Invoice SI-2026-6102 Overdue - Payment Required",
    body: `Dear AP Team,

This is an automated reminder from the Purchase-to-Pay System holding an overdue status:
Invoice No: SI-2026-6102
Vendor: Singtel Enterprise Ltd (UEN: 199201234K)
Outstanding Balance: SGD 1,450.80
Due Date: 2026-06-14 (Overdue by 2 days)

Please process the payments immediately via DBS Corporate Account 003-91234-5 to avoid service restrictions under our strategic supplier service terms.

Regards,
Purchase-to-Pay Command Center`,
    type: "overdue_escalation",
    status: "Delivereded"
  },
  {
    id: "log_2",
    timestamp: "2026-06-10 14:32",
    invoiceNumber: "SI-2026-6204",
    supplierName: "Singtel Enterprise Ltd",
    recipientEmail: "ap.team@acmelogistics.sg",
    subject: "📅 Pending payment notice: Singtel Invoice SI-2026-6204 Due Soon",
    body: `Dear AP Team,

This is a timely notification that Singapore Telecoms Invoice SI-2026-6204 (SGD 1,230.50) is coming due on 2026-05-31.
Please schedule payment through FAST bank route.

Regards,
Purchase-to-Pay Command Center`,
    type: "friendly_pre_due",
    status: "Delivereded"
  }
];

// Helper Functions
export function formatSGD(amount: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
  }).format(amount);
}

export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d1.getTime() - d2.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Check real active status relative to SIMULATED_TODAY
export function calculateUpdatedStatus(dueDateStr: string, currentStatus: InvoiceStatus): InvoiceStatus {
  if (currentStatus === InvoiceStatus.PAID || currentStatus === InvoiceStatus.PROCESSING) {
    return currentStatus;
  }
  const daysDiff = getDaysDifference(dueDateStr, SIMULATED_TODAY);
  if (daysDiff < 0) {
    return InvoiceStatus.OVERDUE;
  }
  return InvoiceStatus.UNPAID;
}
