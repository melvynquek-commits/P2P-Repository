import React, { useState, useEffect } from "react";
import { Invoice, Supplier, OutgoingEmailLog, P2PSettings, InvoiceStatus } from "./types";
import { SEED_INVOICES, SEED_SUPPLIERS, SEED_EMAIL_LOGS, DEFAULT_SETTINGS, SIMULATED_TODAY, calculateUpdatedStatus, formatSGD } from "./utils";
import Dashboard from "./components/Dashboard";
import InvoiceList from "./components/InvoiceList";
import ReminderHub from "./components/ReminderHub";
import P2PAdvisor from "./components/P2PAdvisor";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Receipt, Bell, Bot, Settings, Sliders, RefreshCcw, Landmark, Landmark as FastIcon, Layers, ShieldCheck } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Ledger state loaded from localStorage
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [emailLogs, setEmailLogs] = useState<OutgoingEmailLog[]>([]);
  const [settings, setSettings] = useState<P2PSettings>(DEFAULT_SETTINGS);

  // Load state on mount
  useEffect(() => {
    const cachedInvoices = localStorage.getItem("p2p_invoices");
    const cachedSuppliers = localStorage.getItem("p2p_suppliers");
    const cachedLogs = localStorage.getItem("p2p_emaillogs");
    const cachedSettings = localStorage.getItem("p2p_settings");

    if (cachedInvoices && cachedSuppliers) {
      setInvoices(JSON.parse(cachedInvoices));
      setSuppliers(JSON.parse(cachedSuppliers));
    } else {
      // Seed initially
      setInvoices(SEED_INVOICES);
      setSuppliers(SEED_SUPPLIERS);
      localStorage.setItem("p2p_invoices", JSON.stringify(SEED_INVOICES));
      localStorage.setItem("p2p_suppliers", JSON.stringify(SEED_SUPPLIERS));
    }

    if (cachedLogs) {
      setEmailLogs(JSON.parse(cachedLogs));
    } else {
      setEmailLogs(SEED_EMAIL_LOGS);
      localStorage.setItem("p2p_emaillogs", JSON.stringify(SEED_EMAIL_LOGS));
    }

    if (cachedSettings) {
      setSettings(JSON.parse(cachedSettings));
    } else {
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("p2p_settings", JSON.stringify(DEFAULT_SETTINGS));
    }
  }, []);

  // Sync state helpers
  const saveInvoices = (updated: Invoice[]) => {
    // Recalculate and update current statuses relative to today before saving
    const finalInvoices = updated.map((i) => ({
      ...i,
      status: calculateUpdatedStatus(i.dueDate, i.status),
    }));
    setInvoices(finalInvoices);
    localStorage.setItem("p2p_invoices", JSON.stringify(finalInvoices));
  };

  const handleAddInvoice = (newInv: Invoice) => {
    saveInvoices([...invoices, newInv]);
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm("Are you sure you want to delete this invoice record from the SG ledger?")) {
      saveInvoices(invoices.filter((i) => i.id !== id));
    }
  };

  const handleUpdateStatus = (id: string, status: InvoiceStatus) => {
    saveInvoices(invoices.map((i) => (i.id === id ? { ...i, status } : i)));
  };

  const handleAddEmailLog = (log: OutgoingEmailLog) => {
    const updated = [...emailLogs, log];
    setEmailLogs(updated);
    localStorage.setItem("p2p_emaillogs", JSON.stringify(updated));
  };

  const handleIncrementRemindedCount = (invoiceId: string) => {
    const updated = invoices.map((i) => {
      if (i.id === invoiceId) {
        return {
          ...i,
          remindedCount: i.remindedCount + 1,
          lastRemindedDate: new Date().toISOString().replace("T", " ").substring(0, 16),
        };
      }
      return i;
    });
    saveInvoices(updated);
  };

  // Restores ledger state defaults
  const handleResetSystem = () => {
    if (confirm("Reset the P2P Database back to original Singapore SME mockup benchmarks?")) {
      setInvoices(SEED_INVOICES);
      setSuppliers(SEED_SUPPLIERS);
      setEmailLogs(SEED_EMAIL_LOGS);
      setSettings(DEFAULT_SETTINGS);
      localStorage.setItem("p2p_invoices", JSON.stringify(SEED_INVOICES));
      localStorage.setItem("p2p_suppliers", JSON.stringify(SEED_SUPPLIERS));
      localStorage.setItem("p2p_emaillogs", JSON.stringify(SEED_EMAIL_LOGS));
      localStorage.setItem("p2p_settings", JSON.stringify(DEFAULT_SETTINGS));
      alert("Ledger database restored.");
    }
  };

  // Settings save handler
  const handleSaveSettings = (updated: P2PSettings) => {
    setSettings(updated);
    localStorage.setItem("p2p_settings", JSON.stringify(updated));
    alert("Singapore corporate settings saved successfully.");
  };

  // Counts for notifications
  const overdueInvoicesCount = invoices.filter((i) => i.status === InvoiceStatus.OVERDUE).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-slate-900 selection:text-white" id="p2p-app-root">
      {/* Upper Navigation Rail */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs" id="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 text-white p-2.5 rounded-lg flex items-center justify-center font-bold font-mono tracking-tight shadow-xs">
            P2P
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Purchase-To-Pay Command Center
              <span className="text-[10px] font-mono border border-slate-200 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold uppercase">
                Singapore SME Edition
              </span>
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-0.5">Automated creditor tracking & visual email reminders dispatcher</p>
          </div>
        </div>

        {/* Global Stats indicators */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600" id="header-counters">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <span className="text-slate-400">Aging liabilities:</span>
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-800">
              {invoices.filter(i => i.status !== InvoiceStatus.PAID).length} Items
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-slate-400">Reminders Trigger Alert:</span>
            <span className="font-mono bg-red-100 text-red-700 px-2.5 py-0.5 rounded font-bold">
              {overdueInvoicesCount} Urgent
            </span>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {/* Left Side Control Panel */}
        <aside className="lg:w-64 shrink-0 flex flex-col gap-4" id="app-sidebar">
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-1 shadow-3xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-2">Navigation</span>

            {/* Dashboard tab button */}
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "dashboard"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>AP Dashboard</span>
            </button>

            {/* Invoice Ledger button */}
            <button
              onClick={() => setActiveTab("ledger")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "ledger"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Invoice Ledger DB</span>
            </button>

            {/* Automatic reminders button */}
            <button
              onClick={() => setActiveTab("reminders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "reminders"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4" />
                <span>Automatic Reminders</span>
              </div>
              {overdueInvoicesCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono ${
                  activeTab === "reminders" ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
                }`}>
                  {overdueInvoicesCount}
                </span>
              )}
            </button>

            {/* AI Advisor Chat button */}
            <button
              onClick={() => setActiveTab("advisor")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "advisor"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Bot className="h-4 w-4" />
              <span>P2P Treasury AI</span>
            </button>

            {/* Settings tab button */}
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === "settings"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Singapore AP Rules</span>
            </button>
          </div>

          {/* Quick info status block */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3.5 shadow-3xs" id="quick-settings-status">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block px-1">SME Profile</span>
            <div className="text-xs space-y-2">
              <div>
                <span className="text-slate-400 block font-medium">Reporting Company:</span>
                <span className="text-slate-800 font-bold block truncate">{settings.companyName}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Merchant PayNow UEN:</span>
                <span className="text-slate-800 font-mono text-[11px] block">{settings.defaultPayNowUEN}</span>
              </div>
            </div>

            <button
              onClick={handleResetSystem}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-300 text-slate-500 hover:border-slate-800 hover:text-slate-800 p-2 text-xs rounded-lg transition-colors font-medium cursor-pointer"
            >
              <RefreshCcw className="h-3 w-3" />
              <span>Reset SME Sandbox</span>
            </button>
          </div>
        </aside>

        {/* Right Active Workspace Panel */}
        <main className="flex-1 min-w-0" id="main-content-window">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="focus:outline-hidden"
            >
              {activeTab === "dashboard" && (
                <Dashboard
                  invoices={invoices}
                  suppliers={suppliers}
                  onNavigateToTab={(tabId) => setActiveTab(tabId)}
                />
              )}

              {activeTab === "ledger" && (
                <InvoiceList
                  invoices={invoices}
                  suppliers={suppliers}
                  onAddInvoice={handleAddInvoice}
                  onDeleteInvoice={handleDeleteInvoice}
                  onUpdateInvoiceStatus={handleUpdateStatus}
                />
              )}

              {activeTab === "reminders" && (
                <ReminderHub
                  invoices={invoices}
                  suppliers={suppliers}
                  emailLogs={emailLogs}
                  onTriggerEmail={handleAddEmailLog}
                  onIncrementReminderCount={handleIncrementRemindedCount}
                  companyName={settings.companyName}
                />
              )}

              {activeTab === "advisor" && <P2PAdvisor />}

              {activeTab === "settings" && (
                <SettingsTab
                  settings={settings}
                  onSaveSettings={handleSaveSettings}
                  suppliers={suppliers}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer copyright block */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium" id="app-footer">
        <span>© 2026 Purchase-to-Pay SME Solutions Singapore. All credits settled.</span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          FAST GIRO remittance framework compliant with MAS advisory limits.
        </span>
      </footer>
    </div>
  );
}

// Inner Settings component to prevent redundant files
interface SettingsTabProps {
  settings: P2PSettings;
  onSaveSettings: (settings: P2PSettings) => void;
  suppliers: Supplier[];
}

function SettingsTab({ settings, onSaveSettings, suppliers }: SettingsTabProps) {
  const [compName, setCompName] = useState(settings.companyName);
  const [apEmail, setApEmail] = useState(settings.financeTeamEmail);
  const [uen, setUen] = useState(settings.defaultPayNowUEN);
  const [bank, setBank] = useState(settings.defaultBankRoute);
  const [acct, setAcct] = useState(settings.defaultBankAccount);
  const [preDue, setPreDue] = useState(settings.preDueRemindDays);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      companyName: compName,
      financeTeamEmail: apEmail,
      defaultPayNowUEN: uen,
      defaultBankRoute: bank,
      defaultBankAccount: acct,
      preDueRemindDays: Number(preDue) || 3,
    });
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6" id="settings-desk">
      <div>
        <h3 className="text-base font-bold text-slate-800">Singapore Corporate Treasury Settings</h3>
        <p className="text-xs text-slate-500 mt-1">Configure company identifiers, standard remittance channels, and AP thresholds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Reporting Company Name</label>
            <input
              type="text"
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Accounts Payable Email (AP Team)</label>
            <input
              type="email"
              value={apEmail}
              onChange={(e) => setApEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Company Corporate UEN (Singapore PayNow)</label>
            <input
              type="text"
              value={uen}
              onChange={(e) => setUen(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Default FAST Settlement Bank Route</label>
            <input
              type="text"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Corporate Bank Account Number</label>
            <input
              type="text"
              value={acct}
              onChange={(e) => setAcct(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Pre-Due Notification Days Threshold</label>
            <input
              type="number"
              min="1"
              max="14"
              value={preDue}
              onChange={(e) => setPreDue(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Suppliers overview list as quick directory reference inside settings */}
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3" id="supplier-lookup">
          <span className="text-xs font-bold text-slate-700">Suppliers Master Directory Reference</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suppliers.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-800 text-xs">{s.name}</span>
                    {s.isStrategic && (
                      <span className="text-[8.5px] font-mono uppercase bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-bold">
                        Strategic
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono block">UEN: {s.uen}</span>
                </div>
                <div className="text-[10.5px] mt-2 text-slate-500">
                  <span className="block font-sans">Contact: {s.contactPerson} ({s.email})</span>
                  <span className="block font-mono text-slate-400">Terms: {s.paymentTermDays} Days Credit</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-right">
          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-5 py-2.5 rounded-lg cursor-pointer transition-colors"
            id="save-settings-btn"
          >
            Save Corporate Settings
          </button>
        </div>
      </form>
    </div>
  );
}
