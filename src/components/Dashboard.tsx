import React from "react";
import { Invoice, Supplier, InvoiceStatus } from "../types";
import { formatSGD, SIMULATED_TODAY, getDaysDifference } from "../utils";
import { AlertCircle, ArrowUpRight, CheckCircle, ShieldAlert, TrendingUp, Landmark, Award } from "lucide-react";

interface DashboardProps {
  invoices: Invoice[];
  suppliers: Supplier[];
  onNavigateToTab: (tabId: string) => void;
}

export default function Dashboard({ invoices, suppliers, onNavigateToTab }: DashboardProps) {
  // Calculations
  const getSupplier = (id: string) => suppliers.find((s) => s.id === id);

  const unpaidInvoices = invoices.filter((i) => i.status !== InvoiceStatus.PAID);
  const overdueInvoices = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE);
  
  const totalOutstandingSgd = unpaidInvoices.reduce((sum, curr) => sum + curr.totalAmountSgd, 0);
  const totalOverdueSgd = overdueInvoices.reduce((sum, curr) => sum + curr.totalAmountSgd, 0);

  // Strategic suppliers balance
  const strategicExposure = unpaidInvoices.reduce((sum, curr) => {
    const sup = getSupplier(curr.supplierId);
    if (sup?.isStrategic) {
      return sum + curr.totalAmountSgd;
    }
    return sum;
  }, 0);

  const totalPaidInvoices = invoices.filter((i) => i.status === InvoiceStatus.PAID);
  const totalPaidAmount = totalPaidInvoices.reduce((sum, curr) => sum + curr.totalAmountSgd, 0);

  // Aging distribution relative to 2026-06-22
  let notDueYet = 0;
  let overdue1to7 = 0;
  let overdue8To30 = 0;
  let overdueMore30 = 0;

  unpaidInvoices.forEach((inv) => {
    const daysDiff = getDaysDifference(inv.dueDate, SIMULATED_TODAY);
    if (daysDiff >= 0) {
      notDueYet += inv.totalAmountSgd;
    } else {
      const positiveElapsed = Math.abs(daysDiff);
      if (positiveElapsed <= 7) {
        overdue1to7 += inv.totalAmountSgd;
      } else if (positiveElapsed <= 30) {
        overdue8To30 += inv.totalAmountSgd;
      } else {
        overdueMore30 += inv.totalAmountSgd;
      }
    }
  });

  const grandUnpaid = notDueYet + overdue1to7 + overdue8To30 + overdueMore30;
  const percentNotDue = grandUnpaid ? (notDueYet / grandUnpaid) * 100 : 0;
  const percent1to7 = grandUnpaid ? (overdue1to7 / grandUnpaid) * 100 : 0;
  const percent8to30 = grandUnpaid ? (overdue8To30 / grandUnpaid) * 100 : 0;
  const percentOver30 = grandUnpaid ? (overdueMore30 / grandUnpaid) * 100 : 0;

  // Urgent alerts
  const criticalInvoicesList = unpaidInvoices
    .map((inv) => {
      const daysDiff = getDaysDifference(inv.dueDate, SIMULATED_TODAY);
      return { ...inv, daysDiff, supplier: getSupplier(inv.supplierId) };
    })
    .sort((a, b) => a.daysDiff - b.daysDiff)
    .slice(0, 3); // top 3 closest/overdue

  return (
    <div className="space-y-6" id="dashboard-tab">
      {/* Simulation Banner */}
      <div className="bg-slate-900 text-slate-100 px-6 py-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-800" id="sim-banner">
        <div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Simulation Ledger Active</span>
          <h2 className="text-sm font-medium mt-1">P2P Accounting Command Center configured to Singapore Standard Time (SST)</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Current Simulation Date:</span>
          <span className="font-mono text-sm bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-white font-bold">{SIMULATED_TODAY}</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics-grid">
        {/* Total Outstanding */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between" id="metric-outstanding">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Liability</span>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900 font-mono">
                {formatSGD(totalOutstandingSgd)}
              </h3>
            </div>
            <div className="bg-slate-100 p-2 rounded-md">
              <Landmark className="h-5 w-5 text-slate-600" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-500">
            <TrendingUp className="h-3.5 w-3.5 text-blue-500" />
            <span>Across <strong className="font-semibold">{unpaidInvoices.length}</strong> active unpaid items</span>
          </div>
        </div>

        {/* Total Overdue */}
        <div className={`bg-white p-5 rounded-lg border shadow-xs flex flex-col justify-between ${totalOverdueSgd > 0 ? 'border-red-200 bg-red-50/10' : 'border-slate-200'}`} id="metric-overdue">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue Balance</span>
              <h3 className="text-2xl font-semibold tracking-tight text-red-600 font-mono">
                {formatSGD(totalOverdueSgd)}
              </h3>
            </div>
            <div className={`p-2 rounded-md ${totalOverdueSgd > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
              <AlertCircle className={`h-5 w-5 ${totalOverdueSgd > 0 ? 'text-red-600' : 'text-slate-600'}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${totalOverdueSgd > 0 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
              {overdueInvoices.length} Overdue
            </span>
            <span className="text-slate-500">Requires swift AP response</span>
          </div>
        </div>

        {/* Strategic Supplier Exposure */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between" id="metric-strategic">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Strategic Creditors</span>
                <Award className="h-3 w-3 text-amber-500" />
              </div>
              <h3 className="text-2xl font-semibold tracking-tight text-amber-700 font-mono">
                {formatSGD(strategicExposure)}
              </h3>
            </div>
            <div className="bg-amber-50 p-2 rounded-md border border-amber-100">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-slate-500">
            <span className="text-amber-700 font-semibold">Priority Protection</span>
            <span>Avoid supply chain disruption</span>
          </div>
        </div>

        {/* Settle This Month */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between" id="metric-settled">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Paid Sg Ledger</span>
              <h3 className="text-2xl font-semibold tracking-tight text-emerald-700 font-mono">
                {formatSGD(totalPaidAmount)}
              </h3>
            </div>
            <div className="bg-emerald-50 p-2 rounded-md">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>{totalPaidInvoices.length} invoices paid on-time</span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Aging Analysis Panel */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-6 space-y-6" id="aging-panel">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">SGD Invoice Aging Buckets</h3>
              <p className="text-xs text-slate-500 mt-1">Outstanding liabilities mapped by payment due status</p>
            </div>
            <span className="text-xs text-slate-400 font-mono">Total Outstanding: {formatSGD(totalOutstandingSgd)}</span>
          </div>

          <div className="space-y-5">
            {/* Visual Aging Progress Bar */}
            <div className="h-4 w-full flex rounded-full overflow-hidden bg-slate-100 shadow-inner" id="aging-progress">
              <div style={{ width: `${percentNotDue}%` }} className="bg-slate-400 hover:opacity-90" title="Not Due" />
              <div style={{ width: `${percent1to7}%` }} className="bg-amber-400 hover:opacity-90" title="1-7 Days Overdue" />
              <div style={{ width: `${percent8to30}%` }} className="bg-amber-600 hover:opacity-90" title="8-30 Days Overdue" />
              <div style={{ width: `${percentOver30}%` }} className="bg-red-500 hover:opacity-90" title="30+ Days Overdue" />
            </div>

            {/* Buckets Legend & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2" id="aging-legend">
              {/* Not due */}
              <div className="border border-slate-100 p-3.5 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-slate-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Not Due Yet</p>
                    <p className="text-[11px] font-mono text-slate-400">Within payment terms</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono block text-slate-800">{formatSGD(notDueYet)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{percentNotDue.toFixed(1)}%</span>
                </div>
              </div>

              {/* 1 to 7 Overdue */}
              <div className={`border p-3.5 rounded-lg flex items-center justify-between ${overdue1to7 > 0 ? "border-amber-100 bg-amber-50/10" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">1 - 7 Days Overdue</p>
                    <p className="text-[11px] font-mono text-amber-600">Minor lag</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono block text-slate-800">{formatSGD(overdue1to7)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{percent1to7.toFixed(1)}%</span>
                </div>
              </div>

              {/* 8 to 30 Overdue */}
              <div className={`border p-3.5 rounded-lg flex items-center justify-between ${overdue8To30 > 0 ? "border-amber-200 bg-amber-100/10" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">8 - 30 Days Overdue</p>
                    <p className="text-[11px] font-mono text-amber-700">Severe delay</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono block text-amber-700">{formatSGD(overdue8To30)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{percent8to30.toFixed(1)}%</span>
                </div>
              </div>

              {/* Over 30 Overdue */}
              <div className={`border p-3.5 rounded-lg flex items-center justify-between ${overdueMore30 > 0 ? "border-red-200 bg-red-50/10" : "border-slate-100"}`}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">30+ Days Overdue</p>
                    <p className="text-[11px] font-mono text-red-600">High Risk of Dispute</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold font-mono block text-red-600">{formatSGD(overdueMore30)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{percentOver30.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Treasury Optimization Strategy</p>
              <p>
                In Singapore, typical prompt payment terms align to 30 days. Priority is given to settling strategic 
                creditors with critical services (e.g. telecom infrastructure, grid power) to secure uninterrupted operation. Standard retail or consultant pay batches can be aggregated during cash-flow runs.
              </p>
            </div>
          </div>
        </div>

        {/* Priority Action Alerts */}
        <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-6 flex flex-col justify-between" id="alerts-panel">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-800">Critical Payment Alerts</h3>
              <p className="text-xs text-slate-500 mt-1">Outstanding items needing immediate email warning triggers</p>
            </div>

            <div className="space-y-3" id="critical-items-list">
              {criticalInvoicesList.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  All invoice payments are up-to-date! No outstanding alerts.
                </div>
              ) : (
                criticalInvoicesList.map((inv) => {
                  const isOverdue = inv.daysDiff < 0;
                  return (
                    <div
                      key={inv.id}
                      className={`p-3.5 rounded-lg border flex flex-col gap-2 transition-all ${
                        isOverdue
                          ? inv.supplier?.isStrategic
                            ? "bg-red-50/25 border-red-200"
                            : "bg-slate-50/50 border-amber-200"
                          : "bg-slate-50/30 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">{inv.invoiceNumber}</span>
                            {inv.supplier?.isStrategic && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                                ★ Strategic
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">{inv.supplier?.name}</p>
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-900">{formatSGD(inv.totalAmountSgd)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-slate-200/80 mt-1">
                        <span className="text-slate-400">Due: {inv.dueDate}</span>
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded ${
                            isOverdue
                              ? "text-red-700 bg-red-100"
                              : "text-amber-800 bg-amber-100"
                          }`}
                        >
                          {isOverdue ? `${Math.abs(inv.daysDiff)} days overdue` : `Due in ${inv.daysDiff} days`}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab("reminders")}
            className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
            id="go-reminders-action"
          >
            Open Reminders Command Hub
          </button>
        </div>
      </div>
    </div>
  );
}
