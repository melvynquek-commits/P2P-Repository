import React, { useState } from "react";
import { Invoice, Supplier, ReminderType, EmailReminderDraft, OutgoingEmailLog, InvoiceStatus } from "../types";
import { formatSGD, SIMULATED_TODAY, getDaysDifference } from "../utils";
import { Mail, RefreshCw, Send, Loader2, Sparkles, CheckSquare, Clock, AlertTriangle, AlertCircle, HelpCircle, Calendar } from "lucide-react";

interface ReminderHubProps {
  invoices: Invoice[];
  suppliers: Supplier[];
  emailLogs: OutgoingEmailLog[];
  onTriggerEmail: (newLog: OutgoingEmailLog) => void;
  onIncrementReminderCount: (invoiceId: string) => void;
  companyName: string;
}

export default function ReminderHub({
  invoices,
  suppliers,
  emailLogs,
  onTriggerEmail,
  onIncrementReminderCount,
  companyName,
}: ReminderHubProps) {
  // State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [activeTone, setActiveTone] = useState<ReminderType>("friendly_pre_due");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [showLogView, setShowLogView] = useState(false);
  const [apiNotice, setApiNotice] = useState<string | null>(null);

  const getSupplier = (id: string) => suppliers.find((s) => s.id === id);

  // Filter invoices that are unpaid or overdue for scanning recommendation
  const targetInvoices = invoices.filter((i) => i.status !== InvoiceStatus.PAID);

  const handleSelectInvoiceAndTone = (inv: Invoice, type: ReminderType) => {
    setSelectedInvoiceId(inv.id);
    setActiveTone(type);
    
    const sup = getSupplier(inv.supplierId);
    if (sup) {
      setRecipientEmail(sup.email);
    }

    // Default fast templated baseline in case they don't hit AI yet
    const daysDiff = getDaysDifference(inv.dueDate, SIMULATED_TODAY);
    const absDays = Math.abs(daysDiff);
    let subj = "";
    if (type === "friendly_pre_due") {
      subj = `📅 Payment Notification: ${companyName} | Invoice ${inv.invoiceNumber}`;
    } else if (type === "due_today") {
      subj = `⚡️ PAY RUN SLA TODAY: Invoice ${inv.invoiceNumber} Due Today`;
    } else if (type === "overdue_escalation") {
      subj = `⚠️ IMMEDIATE ATTENTION: Overdue SGD ${inv.totalAmountSgd.toFixed(2)} Invoice ${inv.invoiceNumber}`;
    } else {
      subj = `🚨 FINAL NOTICE: Settlement Grace Period for Invoice ${inv.invoiceNumber}`;
    }
    setEmailSubject(subj);
    setEmailBody("Select an item below and click 'Write Reminder with AI' to compose an optimized corporate email, or send the baseline template.");
  };

  // Call the server endpoint to draft email with Gemini!
  const handleDraftWithAI = async () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
    if (!inv) return alert("Please select an invoice from the alerts scanner first.");

    const sup = getSupplier(inv.supplierId);
    if (!sup) return;

    setIsDrafting(true);
    setApiNotice(null);

    const daysDiff = getDaysDifference(inv.dueDate, SIMULATED_TODAY);
    const outstandingDays = daysDiff < 0 ? `${Math.abs(daysDiff)} days overdue` : `due in ${daysDiff} days`;

    try {
      const response = await fetch("/api/gemini/draft-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: inv.invoiceNumber,
          supplierName: sup.name,
          uen: sup.uen,
          dueAmount: inv.totalAmountSgd,
          dueDate: inv.dueDate,
          isStrategic: sup.isStrategic,
          tone: activeTone,
          paymentDetails: sup.paymentAccountAddress,
          paymentRoute: sup.isStrategic ? "Sg FAST Premium Route" : "Standard PayNow GIRO Batches",
          bankAccount: sup.paymentAccountAddress,
          outstandingDays: outstandingDays,
        }),
      });

      if (!response.ok) {
        throw new Error("P2P server return status error " + response.status);
      }

      const data = await response.json();
      
      // Parse out a subject from response if Gemini wrote it on line 1, otherwise keep default
      const lines = data.text.split("\n");
      const subjectLine = lines.find((l: string) => l.toLowerCase().startsWith("subject:"));
      if (subjectLine) {
        setEmailSubject(subjectLine.replace(/subject:\s*/i, "").trim());
        // Filter out subject line from the body text
        const bodyContent = lines.filter((l: string) => !l.toLowerCase().startsWith("subject:")).join("\n").trim();
        setEmailBody(bodyContent);
      } else {
        setEmailBody(data.text);
      }

      // Check server notification regarding key
      const healthCheck = await fetch("/api/health").then(res => res.json()).catch(() => null);
      if (healthCheck && !healthCheck.apiKeyConfigured) {
        setApiNotice("AI Running in Offline/Templated Fallback Mode. To unlock full LLM-crafted context, add your GEMINI_API_KEY in Settings.");
      } else {
        setApiNotice("AI drafted email successfully utilizing Gemini 3.5-flash.");
      }

    } catch (err: any) {
      console.error(err);
      alert("Error calling server API. Using internal local backup generator.");
      setEmailBody(`Attention Accounts Payable,

Please prioritize the payment processing for the following supplier:
Invoice: ${inv.invoiceNumber}
Supplier: ${sup.name}
Amount: SGD ${inv.totalAmountSgd.toFixed(2)}
Due Date: ${inv.dueDate}

Remount instructions: FAST 01-3920.

Regards,
P2P Treasury lead`);
    } finally {
      setIsDrafting(false);
    }
  };

  // Mailto builder so standard mail app triggers
  const getMailtoString = () => {
    const encodedSubject = encodeURIComponent(emailSubject);
    const encodedBody = encodeURIComponent(emailBody);
    return `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const handleExecuteSend = () => {
    const inv = invoices.find((i) => i.id === selectedInvoiceId);
    if (!inv) return alert("Select an item first.");
    const sup = getSupplier(inv.supplierId);

    // Create the new historic audit log entries
    const newLog: OutgoingEmailLog = {
      id: "log_" + Date.now(),
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 16),
      invoiceNumber: inv.invoiceNumber,
      supplierName: sup?.name || "Unknown Supplier",
      recipientEmail: recipientEmail,
      subject: emailSubject,
      body: emailBody,
      type: activeTone,
      status: "Delivereded",
    };

    onTriggerEmail(newLog);
    onIncrementReminderCount(inv.id);
    
    // Increment local metrics, show notification
    alert(`Reminder dispatched! Simulated mail logged for Invoice ${inv.invoiceNumber} to ${recipientEmail}`);

    // Trigger local reset
    setSelectedInvoiceId("");
    setEmailBody("");
    setEmailSubject("");
  };

  return (
    <div className="space-y-6" id="reminders-command-hub">
      {/* Selector Tabs for Logs vs Workspace */}
      <div className="flex border-b border-slate-200" id="reminders-tab-navigation">
        <button
          onClick={() => setShowLogView(false)}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            !showLogView ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Draft & Remind Desk
        </button>
        <button
          onClick={() => setShowLogView(true)}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            showLogView ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Sent Email Reminders Log ({emailLogs.length})
        </button>
      </div>

      {!showLogView ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="remind-workspace">
          {/* Left panel: Alerts Recommended Trigger scan */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 space-y-4" id="alerts-scroller">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Pending SGD Payments Ledger Outbox</h3>
              <p className="text-xs text-slate-500 mt-1">Recommended reminders based on chronological aging thresholds</p>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1" id="scannable-cards">
              {targetInvoices.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  Aged ledger is current. No pending unpaid invoices to notify!
                </div>
              ) : (
                targetInvoices.map((inv) => {
                  const sup = getSupplier(inv.supplierId);
                  const daysDiff = getDaysDifference(inv.dueDate, SIMULATED_TODAY);
                  const isOverdue = daysDiff < 0;

                  // Determine suggested reminder tone automatically
                  let suggestedTone: ReminderType = "friendly_pre_due";
                  if (daysDiff === 0) {
                    suggestedTone = "due_today";
                  } else if (daysDiff < 0 && daysDiff >= -7) {
                    suggestedTone = "overdue_escalation";
                  } else if (daysDiff < -7) {
                    suggestedTone = "urgent_final";
                  }

                  const isSelected = selectedInvoiceId === inv.id && activeTone === suggestedTone;

                  return (
                    <div
                      key={inv.id}
                      onClick={() => handleSelectInvoiceAndTone(inv, suggestedTone)}
                      className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-slate-800 border-slate-800 bg-slate-50"
                          : "border-slate-200 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-mono font-bold text-slate-900">{inv.invoiceNumber}</span>
                            {sup?.isStrategic && (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded font-medium">
                                Strategic
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{sup?.name}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-950">{formatSGD(inv.totalAmountSgd)}</span>
                      </div>

                      {/* Info Row */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 mt-2">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-400">Due: {inv.dueDate}</span>
                        </div>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                            isOverdue
                              ? "bg-red-50 text-red-700"
                              : daysDiff === 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {isOverdue ? `${Math.abs(daysDiff)} days overdue` : daysDiff === 0 ? "Due Today" : `In ${daysDiff} days`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                        <span>Attempts Outward: {inv.remindedCount}</span>
                        <span className="text-blue-600 font-semibold uppercase tracking-wide">
                          Click to Load Draft
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right panel: Composer with AI drafting option */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 flex flex-col justify-between" id="reminders-composer">
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-500" />
                    AP Payment Reminder Draft
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Draft professional payment notices to clear liabilities</p>
                </div>
                {selectedInvoiceId && (
                  <button
                    onClick={handleDraftWithAI}
                    disabled={isDrafting}
                    className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-medium text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-3xs transition-colors"
                    id="draft-with-ai-btn"
                  >
                    {isDrafting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    <span>{isDrafting ? "AI Drafting..." : "Generate with Gemini"}</span>
                  </button>
                )}
              </div>

              {selectedInvoiceId ? (
                <div className="space-y-3.5" id="active-draft">
                  {apiNotice && (
                    <div className="bg-slate-100 border border-slate-200/50 p-2.5 rounded text-[10.5px] text-slate-600">
                      ⚡️ {apiNotice}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Supplier Recipient</label>
                      <input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-hidden font-mono mt-1"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Remind Alert Urgency</label>
                      <select
                        value={activeTone}
                        onChange={(e) => setActiveTone(e.target.value as ReminderType)}
                        className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-hidden mt-1 font-semibold"
                      >
                        <option value="friendly_pre_due">📅 Friendly Pre-Due (Pre-Audit Alert)</option>
                        <option value="due_today">⚡️ Payment Slated Today (DUE TODAY)</option>
                        <option value="overdue_escalation">⚠️ Overdue Notice (Standard Escalation)</option>
                        <option value="urgent_final">🚨 Urgent Final Warning (Finance Freeze Risk)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Email Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2 rounded text-xs focus:outline-hidden font-medium mt-1 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Message Body</label>
                    <textarea
                      value={emailBody}
                      rows={11}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded text-xs focus:outline-hidden font-mono mt-1 text-slate-700 whitespace-pre-wrap leading-relaxed"
                    />
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                  <Clock className="h-8 w-8 text-slate-300" />
                  <p>Invoices requiring reminders will be loaded here.</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Select any recommended invoice from the P2P Outbox list on the left to start drafting customized payment Reminders.
                  </p>
                </div>
              )}
            </div>

            {selectedInvoiceId && (
              <div className="flex gap-2 pt-4 border-t border-slate-100 mt-4" id="draft-actions">
                {/* 1st option: mailto link triggers local default mail handles */}
                <a
                  href={getMailtoString()}
                  onClick={handleExecuteSend}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer text-center transition-colors shadow-3xs"
                  id="send-mailto-action"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Open & Send via Email client</span>
                </a>

                {/* 2nd option: trigger log transaction and close */}
                <button
                  onClick={handleExecuteSend}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-200"
                  id="simulate-send-action"
                >
                  <span>Simulate Send (P2P Log Only)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Delivery Logs table view */
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4" id="logs-hub">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Payments Notification Reminders Audit Log</h3>
            <p className="text-xs text-slate-500 mt-1">Immutable audit trail of email alerts processed via this P2P Ledger</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-mono tracking-wider font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Alert Type</th>
                  <th className="py-3 px-4 text-center">Gateway Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                {emailLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      No reminder alerts dispatched yet.
                    </td>
                  </tr>
                ) : (
                  [...emailLogs].reverse().map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-950">{log.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{log.supplierName}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">{log.recipientEmail}</td>
                      <td className="py-3.5 px-4 max-w-[240px] truncate text-slate-600" title={log.subject}>
                        {log.subject}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[10px]">
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            log.type === "urgent_final"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : log.type === "overdue_escalation"
                              ? "bg-amber-50 text-amber-700 border border-amber-100"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {log.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">
                        <span className="flex items-center justify-center gap-1">
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="text-[10px] uppercase font-mono tracking-wide font-bold">Dispatched</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
