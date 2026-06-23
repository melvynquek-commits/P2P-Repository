import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Ensure dev environments read local .env secrets (handled automatically by the platform, but safe fallback)
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && apiKey.trim() !== "") {
      geminiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
  }
  return geminiClient;
}

// REST API endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    apiKeyConfigured: !!getGeminiClient(),
    timestamp: new Date().toISOString(),
  });
});

// Draft email using Gemini API
app.post("/api/gemini/draft-reminder", async (req, res) => {
  const {
    invoiceNumber,
    supplierName,
    uen,
    dueAmount,
    dueDate,
    isStrategic,
    tone,
    paymentDetails,
    paymentRoute,
    bankAccount,
    outstandingDays,
  } = req.body;

  const client = getGeminiClient();

  if (!client) {
    // Elegant system fallback draft when no API Key is provided
    console.log("No Gemini API key available. Generating standard P2P template fallback.");
    let subject = ``;
    let greeting = `Dear Accounts Payable Team,`;
    let reason = "payment scheduling review";
    let closing = "Please update the payment receipt in the ledger once completed.";

    if (tone === "friendly_pre_due") {
      subject = `⏰ Upcoming Payment Notification: ${supplierName} Invoice ${invoiceNumber}`;
      reason = "upcoming maturity review";
    } else if (tone === "due_today") {
      subject = `⚡️ PAYMENT DUE TODAY: ${supplierName} Invoice ${invoiceNumber}`;
      reason = "today's payment run list";
    } else if (tone === "overdue_escalation") {
      subject = `⚠️ OVERDUE ACTION REQUIRED: ${supplierName} Invoice ${invoiceNumber}`;
      reason = "immediate fund transfer under contract terms";
      greeting = "Dear Accounts Payable Lead / Director,";
      closing = "Please confirm the transaction copy by close of business today to minimize any service impact.";
    } else {
      subject = `🚨 CRITICAL REMINDER: Final Notice for ${supplierName} Invoice ${invoiceNumber}`;
      reason = "final grace period reconciliation";
      greeting = "CONFIDENTIAL: Immediate Attention of AP Director,";
      closing = "Please release payment instantly and send transaction bank receipt to avoid strategic service suspension.";
    }

    const fallbackBody = `Subject: ${subject}

${greeting}

This is an automated notification from the P2P Invoice Reminder System regarding outstanding liabilities.

Please schedule payment for the following invoice matching your ledger:
• Invoice Number : ${invoiceNumber}
• Supplier Name  : ${supplierName} ${uen ? `(UEN: ${uen})` : ""}
• Total Due      : SGD ${Number(dueAmount).toFixed(2)}
• Due Date       : ${dueDate} (${outstandingDays} days)
• Vendor Status  : ${isStrategic ? "★ Strategic Key Partner" : "Standard Vendor"}

Preferred Remittance Mode:
- Channel: ${paymentRoute || "FAST Transfer"}
- Account: ${bankAccount || "Corporate PayNow"}
- Reference: ${invoiceNumber}

Note on Business Importance:
${isStrategic 
  ? "This is a strategic supplier. It is essential to settle this amount promptly to preserve contract credit limits, operational goodwill, and priority service dispatch." 
  : "Prompt settlement ensures regulatory reconciliation, accurate aging indicators, and zero administrative late fee penalties."
}

${closing}

Sincerely,
P2P Command Center
Acme Logistics Singapore Pte Ltd
(Auto-Generated Fallback Draft)`;

    return res.json({ text: fallbackBody });
  }

  try {
    const relationToneDescription = isStrategic 
      ? "Strategic Key Partner! (Highly respectful, strategic focus, preserve business relationships, absolute professionalism)."
      : "Standard Vendor (Professional, standard transaction terms).";

    let toneGuidance = "";
    if (tone === "friendly_pre_due") {
      toneGuidance = "Friendly pre-due notification. Gently remind them a payment date is coming up. Helpful, collaborative, positive.";
    } else if (tone === "due_today") {
      toneGuidance = "Due date notification. Concise, direct, pointing out that payment is slated for execution today. Ask to queue the transfer.";
    } else if (tone === "overdue_escalation") {
      toneGuidance = "Overdue escalation! Polite but serious. Highlight number of days overdue. Remind them of terms and request immediate scheduling.";
    } else {
      toneGuidance = "Urgent Final Notice! Extremely serious P2P notice. Demands immediate payment within 24 hours to prevent supplier service suspension or credit line damage.";
    }

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Draft a professional, clear, business email to remind the SME Accounts Payable team to make a timely payment.
      
Invoice Details:
- Invoice # : ${invoiceNumber}
- Supplier: ${supplierName} (Singapore UEN: ${uen || "N/A"})
- SGD Amount: ${dueAmount}
- Due Date: ${dueDate} (${outstandingDays})
- Strategic Partner Category: ${relationToneDescription}
- Intended Email Action Level: ${toneGuidance}
- SGD Bank Remittance Instructions: ${paymentRoute} (Account: ${bankAccount})
- Vendor Payment Link/Ref: Invoice #${invoiceNumber}

Requirements:
1. Include a clear Subject line at the very top (e.g., matching the urgency tone: "⏰ PRE-DUE NOTICE: ...", "🚨 OVERDUE NOTICE:...").
2. Lay out details in a cleanly structured, scannable format (such as bullet points or a simple text table).
3. Draft a direct, human-centric mail from the Acme Logistics Finance controller to the internal team or AP clerk. Keep it realistic, respectful, and highly action-oriented.
4. Output ONLY the raw email text (Subject and Body). Avoid any chatbot remarks, intro sentences, or markdown blocks like \`\`\`email or \`\`\`text. Just the clear email text itself.`,
    });

    const resultText = response.text || "Failed to generate reminder draft.";
    res.json({ text: resultText });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Error generating draft with Gemini." });
  }
});

// Chatbot endpoint for expert P2P accounting consultations
app.post("/api/gemini/advisor", async (req, res) => {
  const { messages } = req.body;
  const client = getGeminiClient();

  if (!client) {
    // Standard advisor responses fallback
    return res.json({
      text: "👋 I am your AI P2P Consultant! To unlock fully dynamic discussions powered by Gemini 3.5, please configure a `GEMINI_API_KEY` in **Settings > Secrets**.\n\nQuick advice regarding Singapore SME payments:\n1. **FAST vs GIRO**: FAST settlements take under 5 minutes (max SGD 200,000 per transaction). Great for urgent supplier items. GIRO is ideal for recurring, bulk batch monthly runs but has a 2-3 day lag.\n2. **PayNow Corporate**: Settle with vendor's SG UEN instantly. This avoids keying in clerical bank account digits, preventing invoice redirection fraud.\n3. **GST 9% Check**: Verify suppliers charging GST have a valid IRAS registry status before paying.",
    });
  }

  try {
    const formattedContents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const systemPrompt = `You are a Singapore P2P (Purchase-to-Pay) Guru, a seasoned treasurer, auditor, and Corporate Chartered Accountant (Singapore CA).
    
    Offer deep, precise expertise on Singapore corporate accounting practices including:
    - Accounts Payable optimization, cash-flow runaways, working capital strategies.
    - Singapore-specific local payment rails: FAST (Fast and Secure Transfers), GIRO bulk batches, PayNow Corporate (using UEN), and Telegraphic Transfers (TT / SWIFT).
    - IRAS tax guidelines including Singapore Goods Services Tax (GST) current at 9%, and UEN verification.
    - Supplier vendor management, prompt payment terms (14, 30, 45, 60 days), early settlement discounts (e.g. 2/10 net 30), and credit limits.
    - Cash-flow protection: How to balance paying strategic critical partners first (to guard production chains) vs standard utilities or minor goods.
    
    Rules for tone:
    - Highly professional, respectful, calm, objective, but extremely practical.
    - Use Singapore commercial context where friendly (e.g. references to DBS, OCBC, UOB, FAST, PayNow, UEN, IRAS).
    - Keep answers clear, beautifully formatting points with clean bullet structures.`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    res.json({ text: response.text || "Unable to formulate advice currently." });
  } catch (error: any) {
    console.error("Gemini Advisor error:", error);
    res.status(500).json({ error: error.message || "Consultation error." });
  }
});

// Setup Vite Dev server or Serve static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite HMR disabled...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server securely running on port ${PORT}`);
  });
}

startServer();
