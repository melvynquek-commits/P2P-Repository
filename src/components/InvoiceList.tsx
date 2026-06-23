import React, { useState } from "react";
import { Invoice, Supplier, InvoiceStatus, InvoiceItem } from "../types";
import { formatSGD, SIMULATED_TODAY, getDaysDifference } from "../utils";
import { Search, Plus, Calendar, Receipt, FileText, Check, ShieldCheck, Trash2, ArrowUpDown } from "lucide-react";

interface InvoiceListProps {
  invoices: Invoice[];
  suppliers: Supplier[];
  onAddInvoice: (newInvoice: Invoice) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => void;
}

export default function InvoiceList({
  invoices,
  suppliers,
  onAddInvoice,
  onDeleteInvoice,
  onUpdateInvoiceStatus,
}: InvoiceListProps) {
  // Local state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Unpaid" | "Overdue" | "Paid">("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [sortField, setSortField] = useState<"dueDate" | "totalAmountSgd" | "invoiceNumber">("dueDate");
  const [sortAsc, setSortAsc] = useState(true);

  // Form State
  const [formSupplierId, setFormSupplierId] = useState(suppliers[0]?.id || "");
  const [formInvoiceNo, setFormInvoiceNo] = useState("");
  const [formIssueDate, setFormIssueDate] = useState("2026-06-15");
  const [formDueDate, setFormDueDate] = useState("2026-07-15");
  const [formMatchedPO, setFormMatchedPO] = useState("");
  const [formDesc, setFormDesc] = useState("");
  
  // Dynamic line items state inside form
  const [formItems, setFormItems] = useState<Omit<InvoiceItem, "id">[]>([
    { description: "General office goods and services", qty: 1, rate: 100, amount: 100 },
  ]);

  const handleAddItemRow = () => {
    setFormItems([...formItems, { description: "New Item", qty: 1, rate: 0, amount: 0 }]);
  };

  const handleItemFieldChange = (index: number, field: keyof Omit<InvoiceItem, "id">, value: any) => {
    const updated = [...formItems];
    if (field === "qty" || field === "rate") {
      const val = Number(value) || 0;
      updated[index] = {
        ...updated[index],
        [field]: val,
        amount: field === "qty" ? val * updated[index].rate : updated[index].qty * val,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormItems(updated);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const calculateFormTotal = () => {
    return formItems.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formInvoiceNo.trim()) return alert("Please supply Invoice Number.");
    if (!formSupplierId) return alert("Please map to a valid Supplier.");

    const finalTotal = calculateFormTotal();
    const isOverdue = getDaysDifference(formDueDate, SIMULATED_TODAY) < 0;

    const newInvoice: Invoice = {
      id: "inv_" + Date.now(),
      invoiceNumber: formInvoiceNo.toUpperCase(),
      supplierId: formSupplierId,
      issueDate: formIssueDate,
      dueDate: formDueDate,
      totalAmountSgd: finalTotal,
      status: isOverdue ? InvoiceStatus.OVERDUE : InvoiceStatus.UNPAID,
      matchedPurchaseOrder: formMatchedPO.trim() || undefined,
      description: formDesc || "Custom supplier purchase manual entry",
      items: formItems.map((item, idx) => ({
        id: `item_${Date.now()}_${idx}`,
        ...item,
      })),
      remindedCount: 0,
    };

    onAddInvoice(newInvoice);
    
    // reset form
    setFormInvoiceNo("");
    setFormDesc("");
    setFormMatchedPO("");
    setFormItems([{ description: "General office goods and services", qty: 1, rate: 100, amount: 100 }]);
    setShowAddForm(false);
  };

  const toggleSort = (field: "dueDate" | "totalAmountSgd" | "invoiceNumber") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Filter & Search computation
  const getSupplier = (id: string) => suppliers.find((s) => s.id === id);

  const filteredInvoices = invoices
    .filter((inv) => {
      const sup = getSupplier(inv.supplierId);
      const supplierName = sup ? sup.name.toLowerCase() : "";
      const query = searchQuery.toLowerCase();
      const uenText = sup ? sup.uen.toLowerCase() : "";
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(query) ||
        supplierName.includes(query) ||
        uenText.includes(query) ||
        (inv.matchedPurchaseOrder && inv.matchedPurchaseOrder.toLowerCase().includes(query));

      if (activeFilter === "All") return matchesSearch;
      if (activeFilter === "Paid") return inv.status === InvoiceStatus.PAID && matchesSearch;
      if (activeFilter === "Overdue") return inv.status === InvoiceStatus.OVERDUE && matchesSearch;
      if (activeFilter === "Unpaid") {
        return (inv.status === InvoiceStatus.UNPAID || inv.status === InvoiceStatus.PROCESSING) && matchesSearch;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "dueDate") {
        comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortField === "totalAmountSgd") {
        comparison = a.totalAmountSgd - b.totalAmountSgd;
      } else if (sortField === "invoiceNumber") {
        comparison = a.invoiceNumber.localeCompare(b.invoiceNumber);
      }
      return sortAsc ? comparison : -comparison;
    });

  return (
    <div className="space-y-6" id="ledger-hub">
      {/* Search and control row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-3xs" id="ledger-controls">
        <div className="relative flex-1" id="search-container">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Supplier Name, UEN, Invoice No, or PO #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-hidden focus:border-slate-500 font-sans"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap" id="filter-container">
          {/* Filters */}
          <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50" id="filter-tabs">
            {(["All", "Unpaid", "Overdue", "Paid"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all ${
                  activeFilter === filter
                    ? "bg-white text-slate-900 shadow-3xs font-semibold"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
            id="add-invoice-trigger"
          >
            <Plus className="h-4 w-4" />
            <span>Ingest Invoice</span>
          </button>
        </div>
      </div>

      {/* Manual Ingestion Form Modal overlay style (when visible) */}
      {showAddForm && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 space-y-6" id="add-invoice-form-panel">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-semibold text-slate-800">Add Invoice to SGD Database</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form details */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Supplier</label>
                <select
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.uen})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ST-40112"
                  value={formInvoiceNo}
                  onChange={(e) => setFormInvoiceNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Matched PO # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PO-450392"
                  value={formMatchedPO}
                  onChange={(e) => setFormMatchedPO(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Date</label>
                <input
                  type="date"
                  required
                  value={formIssueDate}
                  onChange={(e) => setFormIssueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={formDueDate}
                  onChange={(e) => setFormDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Transaction Description</label>
                <input
                  type="text"
                  placeholder="Brief summary of payment dispatch"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs focus:outline-hidden focus:border-slate-500"
                />
              </div>
            </div>

            {/* Line Items Dynamic Row section */}
            <div className="border border-slate-200 rounded-lg bg-slate-50 p-4 space-y-3" id="line-items-editor">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700">Audit-Compliant Line Items</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-2 py-1 rounded"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="space-y-2">
                {formItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6 md:col-span-7">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        required
                        onChange={(e) => handleItemFieldChange(index, "description", e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs focus:outline-hidden"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.qty}
                        required
                        onChange={(e) => handleItemFieldChange(index, "qty", e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs text-center focus:outline-hidden font-mono"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Rate SGD"
                        value={item.rate}
                        required
                        onChange={(e) => handleItemFieldChange(index, "rate", e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded p-1.5 text-xs text-right focus:outline-hidden font-mono"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 text-right text-xs font-semibold font-mono text-slate-700 pt-1">
                      {formatSGD(item.amount)}
                    </div>
                    {formItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(index)}
                        className="col-span-12 md:col-span-1 text-red-500 hover:text-red-700 text-xs py-1"
                      >
                        <Trash2 className="h-3.5 w-3.5 mx-auto" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pr-2 text-xs text-slate-500 font-medium">
                Total Amount: <strong className="text-slate-800 ml-1 font-mono">{formatSGD(calculateFormTotal())}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-transparent hover:bg-slate-100 text-slate-600 font-medium text-xs px-4 py-2 rounded-lg"
              >
                Close
              </button>
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-5 py-2.5 rounded-lg cursor-pointer"
              >
                Save to Invoice Database
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoice Ledger Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs" id="ledger-table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="invoice-grid-table">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-wider font-semibold font-mono">
                <th className="py-3 px-4 py-3.5">
                  <button onClick={() => toggleSort("invoiceNumber")} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">
                    Invoice No
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3 px-4">Supplier / Singapore UEN</th>
                <th className="py-3 px-4">Mat. PO</th>
                <th className="py-3 px-4">
                  <button onClick={() => toggleSort("dueDate")} className="flex items-center gap-1 hover:text-slate-700 cursor-pointer">
                    Payment Due
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">
                  <button onClick={() => toggleSort("totalAmountSgd")} className="flex items-center gap-1 justify-end w-full hover:text-slate-700 cursor-pointer">
                    Amount SGD
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Reminded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No supplier invoices match current search & filter parameters.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const sup = getSupplier(inv.supplierId);
                  const isOverdue = inv.status === InvoiceStatus.OVERDUE;
                  const daysLeft = getDaysDifference(inv.dueDate, SIMULATED_TODAY);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-950">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-800">{sup?.name || "Unknown Vendor"}</span>
                            {sup?.isStrategic && (
                              <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded">
                                Strategic
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">UEN: {sup?.uen || "N/A"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {inv.matchedPurchaseOrder || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <span className="font-mono block">{inv.dueDate}</span>
                          {inv.status !== InvoiceStatus.PAID && (
                            <span className={`text-[10px] font-mono ${daysLeft < 0 ? "text-red-500 font-medium" : "text-slate-400"}`}>
                              {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `Due in ${daysLeft} days`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-950">
                        {formatSGD(inv.totalAmountSgd)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-medium ${
                            inv.status === InvoiceStatus.PAID
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : inv.status === InvoiceStatus.OVERDUE
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : inv.status === InvoiceStatus.PROCESSING
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-xs font-semibold text-slate-600">
                        {inv.remindedCount > 0 ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-sm" title={inv.lastRemindedDate ? `Last reminded: ${inv.lastRemindedDate}` : ""}>
                            {inv.remindedCount}×
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== InvoiceStatus.PAID && (
                            <button
                              onClick={() => onUpdateInvoiceStatus(inv.id, InvoiceStatus.PAID)}
                              className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded"
                              title="Mark as Settle / Paid"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteInvoice(inv.id)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
