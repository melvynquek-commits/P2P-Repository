export enum InvoiceStatus {
  UNPAID = "Unpaid",
  PROCESSING = "Processing",
  PAID = "Paid",
  OVERDUE = "Overdue",
}

export interface InvoiceItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  totalAmountSgd: number;
  status: InvoiceStatus;
  matchedPurchaseOrder?: string;
  description: string;
  items: InvoiceItem[];
  remindedCount: number;
  lastRemindedDate?: string; // YYYY-MM-DD HH:MM
}

export interface Supplier {
  id: string;
  name: string;
  uen: string; // Unique Entity Number (Singapore)
  email: string;
  paymentAccountAddress: string; // Bank details or Corporate PayNow proxy
  paymentTermDays: number; // e.g., 30, 60
  contactPerson: string;
  isStrategic: boolean; // strategic partners get different communication tone
}

export type ReminderType = "friendly_pre_due" | "due_today" | "overdue_escalation" | "urgent_final";

export interface EmailReminderDraft {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  supplierName: string;
  type: ReminderType;
  recipientEmail: string;
  subject: string;
  body: string;
  generatedDate: string;
  status: "draft" | "sent";
}

export interface OutgoingEmailLog {
  id: string;
  timestamp: string;
  invoiceNumber: string;
  supplierName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  type: ReminderType;
  status: "Delivereded" | "Bounced" | "Draft";
}

export interface P2PSettings {
  companyName: string;
  financeTeamEmail: string;
  defaultPayNowUEN: string; // local SG merchant proxy
  defaultBankRoute: string; // local SG bank name (DBS, OCBC, UOB)
  defaultBankAccount: string;
  preDueRemindDays: number; // how many days before to send friendly alert
}
