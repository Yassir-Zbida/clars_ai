import mongoose from "mongoose";
import { AutomationWorkflow } from "@/server/models/automation-workflow";
import { Client } from "@/server/models/client";
import { Contact } from "@/server/models/contact";
import { Expense } from "@/server/models/expense";
import { Interaction } from "@/server/models/interaction";
import { Invoice } from "@/server/models/invoice";
import { MessageTemplate } from "@/server/models/message-template";
import { Payment } from "@/server/models/payment";
import { Project } from "@/server/models/project";

type CreatedClient = {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  company?: string;
  currency: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY_MS);
}

export async function resetAndSeedDemoDashboardForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid userId");
  }
  const uid = new mongoose.Types.ObjectId(userId);

  const [existingInvoices, clients] = await Promise.all([
    Invoice.find({ userId: uid }).select("_id").lean(),
    Client.find({ userId: uid }).select("_id").lean(),
  ]);

  const invoiceIds = existingInvoices.map((x) => x._id as mongoose.Types.ObjectId);
  const clientIds = clients.map((x) => x._id as mongoose.Types.ObjectId);

  await Promise.all([
    invoiceIds.length ? Payment.deleteMany({ invoiceId: { $in: invoiceIds } }) : Promise.resolve(),
    clientIds.length ? Contact.deleteMany({ clientId: { $in: clientIds } }) : Promise.resolve(),
    Interaction.deleteMany({ userId: uid }),
    Expense.deleteMany({ userId: uid }),
    Invoice.deleteMany({ userId: uid }),
    Project.deleteMany({ userId: uid }),
    Client.deleteMany({ userId: uid }),
    AutomationWorkflow.deleteMany({ userId: uid }),
    MessageTemplate.deleteMany({ userId: uid }),
  ]);

  const createdClients = (await Client.create([
    {
      userId: uid,
      fullName: "Yassine Benali",
      company: "Atlas Commerce",
      type: "COMPANY",
      status: "ACTIVE",
      source: "REFERRAL",
      language: "FR",
      currency: "EUR",
      city: "Casablanca",
      tags: ["e-commerce", "retainer"],
      healthScore: 87,
      healthLabel: "STRONG",
      isFavorite: true,
      lastContactAt: daysFromNow(-2),
    },
    {
      userId: uid,
      fullName: "Nora Haddad",
      company: "Noura Beauty",
      type: "COMPANY",
      status: "QUALIFIED",
      source: "SOCIAL",
      language: "AR",
      currency: "MAD",
      city: "Rabat",
      tags: ["branding", "website"],
      healthScore: 73,
      healthLabel: "STRONG",
      lastContactAt: daysFromNow(-7),
    },
    {
      userId: uid,
      fullName: "Karim El Fassi",
      company: "Kasba Logistics",
      type: "COMPANY",
      status: "PROPOSAL",
      source: "WEBSITE",
      language: "EN",
      currency: "USD",
      city: "Tangier",
      tags: ["dashboard", "urgent"],
      healthScore: 62,
      healthLabel: "NEUTRAL",
      lastContactAt: daysFromNow(-4),
    },
    {
      userId: uid,
      fullName: "Lina Sassi",
      company: "Sassi Events",
      type: "COMPANY",
      status: "LEAD",
      source: "SOCIAL",
      language: "FR",
      currency: "EUR",
      city: "Marrakesh",
      tags: ["event", "landing-page"],
      healthScore: 44,
      healthLabel: "AT_RISK",
      lastContactAt: daysFromNow(-22),
    },
    {
      userId: uid,
      fullName: "Omar Amrani",
      company: "Amrani Studio",
      type: "COMPANY",
      status: "ACTIVE",
      source: "UPWORK",
      language: "EN",
      currency: "EUR",
      city: "Fez",
      tags: ["seo", "long-term"],
      healthScore: 79,
      healthLabel: "STRONG",
      lastContactAt: daysFromNow(-1),
    },
    {
      userId: uid,
      fullName: "Salma Idrissi",
      type: "INDIVIDUAL",
      status: "LEAD",
      source: "LINKEDIN",
      language: "FR",
      currency: "EUR",
      city: "Agadir",
      tags: ["portfolio"],
      healthScore: 52,
      healthLabel: "NEUTRAL",
      lastContactAt: daysFromNow(-14),
    },
  ])) as CreatedClient[];

  const c0 = createdClients[0];
  const c1 = createdClients[1];
  const c2 = createdClients[2];
  const c3 = createdClients[3];
  const c4 = createdClients[4];
  const c5 = createdClients[5];

  await Contact.create([
    { clientId: c0._id, fullName: "Yassine Benali", email: "yassine@atlas-commerce.ma", isPrimary: true, jobTitle: "CEO" },
    { clientId: c0._id, fullName: "Hajar Maarouf", email: "hajar@atlas-commerce.ma", jobTitle: "Operations Manager" },
    { clientId: c1._id, fullName: "Nora Haddad", email: "nora@nourabeauty.ma", isPrimary: true, jobTitle: "Founder" },
    { clientId: c2._id, fullName: "Karim El Fassi", email: "karim@kasba-logistics.com", isPrimary: true, jobTitle: "General Manager" },
    { clientId: c3._id, fullName: "Lina Sassi", email: "lina@sassievents.com", isPrimary: true, jobTitle: "Owner" },
    { clientId: c4._id, fullName: "Omar Amrani", email: "omar@amrani-studio.com", isPrimary: true, jobTitle: "Creative Director" },
    { clientId: c5._id, fullName: "Salma Idrissi", email: "salma.idrissi@gmail.com", isPrimary: true, jobTitle: "Freelancer" },
  ]);

  const projects = await Project.create([
    {
      userId: uid,
      clientId: c0._id,
      assignedClientIds: [c0._id],
      name: "Atlas Store CRO Revamp",
      description: "Checkout funnel optimization and retention automations.",
      status: "ACTIVE",
      priority: "HIGH",
      progress: 68,
      startDate: daysFromNow(-40),
      endDate: daysFromNow(25),
      budgetCents: 2600000,
      currency: "EUR",
    },
    {
      userId: uid,
      clientId: c1._id,
      assignedClientIds: [c1._id],
      name: "Noura Beauty Brand Refresh",
      description: "Website redesign and visual identity refresh.",
      status: "ON_HOLD",
      priority: "MEDIUM",
      progress: 45,
      startDate: daysFromNow(-30),
      endDate: daysFromNow(40),
      budgetCents: 1500000,
      currency: "MAD",
    },
    {
      userId: uid,
      clientId: c2._id,
      assignedClientIds: [c2._id],
      name: "Kasba Client Portal",
      description: "Operations dashboard for internal teams.",
      status: "ACTIVE",
      priority: "HIGH",
      progress: 31,
      startDate: daysFromNow(-18),
      endDate: daysFromNow(55),
      budgetCents: 4200000,
      currency: "USD",
    },
    {
      userId: uid,
      clientId: c4._id,
      assignedClientIds: [c4._id],
      name: "Amrani SEO Sprint",
      status: "COMPLETED",
      priority: "LOW",
      progress: 100,
      startDate: daysFromNow(-75),
      endDate: daysFromNow(-8),
      budgetCents: 700000,
      currency: "EUR",
    },
  ]);

  const p0 = projects[0];
  const p1 = projects[1];
  const p2 = projects[2];
  const p3 = projects[3];

  const seededInvoices = await Invoice.create([
    {
      userId: uid,
      clientId: c0._id,
      projectId: p0._id,
      number: "INV-2026-001",
      documentType: "INVOICE",
      title: "Milestone 1 - CRO Audit",
      status: "PARTIALLY_PAID",
      amountCents: 840000,
      taxRatePercent: 20,
      currency: "EUR",
      issuedAt: daysFromNow(-24),
      dueDate: daysFromNow(-10),
      lineItems: [
        { description: "Conversion audit", quantity: 1, unitAmountCents: 420000 },
        { description: "Retention roadmap", quantity: 1, unitAmountCents: 420000 },
      ],
    },
    {
      userId: uid,
      clientId: c0._id,
      projectId: p0._id,
      number: "INV-2026-002",
      documentType: "INVOICE",
      title: "Milestone 2 - Funnel Implementation",
      status: "SENT",
      amountCents: 980000,
      taxRatePercent: 20,
      currency: "EUR",
      issuedAt: daysFromNow(-6),
      dueDate: daysFromNow(8),
      lineItems: [
        { description: "Checkout optimization", quantity: 1, unitAmountCents: 580000 },
        { description: "A/B tests setup", quantity: 1, unitAmountCents: 400000 },
      ],
    },
    {
      userId: uid,
      clientId: c1._id,
      projectId: p1._id,
      number: "INV-2026-003",
      documentType: "INVOICE",
      title: "Design sprint",
      status: "OVERDUE",
      amountCents: 520000,
      currency: "MAD",
      issuedAt: daysFromNow(-35),
      dueDate: daysFromNow(-5),
      lineItems: [{ description: "UI/UX sprint", quantity: 1, unitAmountCents: 520000 }],
    },
    {
      userId: uid,
      clientId: c2._id,
      projectId: p2._id,
      number: "INV-2026-004",
      documentType: "INVOICE",
      title: "Portal backend setup",
      status: "PAID",
      amountCents: 1200000,
      currency: "USD",
      issuedAt: daysFromNow(-28),
      dueDate: daysFromNow(-12),
      lineItems: [{ description: "Backend development", quantity: 1, unitAmountCents: 1200000 }],
    },
    {
      userId: uid,
      clientId: c4._id,
      projectId: p3._id,
      number: "INV-2026-005",
      documentType: "INVOICE",
      title: "SEO sprint closeout",
      status: "PAID",
      amountCents: 700000,
      currency: "EUR",
      issuedAt: daysFromNow(-40),
      dueDate: daysFromNow(-20),
      lineItems: [{ description: "SEO sprint package", quantity: 1, unitAmountCents: 700000 }],
    },
    {
      userId: uid,
      clientId: c5._id,
      number: "QUO-2026-001",
      documentType: "QUOTE",
      title: "Portfolio website package",
      status: "VIEWED",
      amountCents: 260000,
      currency: "EUR",
      issuedAt: daysFromNow(-3),
      dueDate: daysFromNow(12),
      lineItems: [{ description: "Personal brand website", quantity: 1, unitAmountCents: 260000 }],
    },
  ]);

  const inv0 = seededInvoices[0];
  const inv3 = seededInvoices[3];
  const inv4 = seededInvoices[4];

  await Payment.create([
    {
      invoiceId: inv0._id,
      amountCents: 420000,
      paidAt: daysFromNow(-14),
      method: "Bank transfer",
      reference: "TRX-ATLAS-1001",
    },
    {
      invoiceId: inv3._id,
      amountCents: 1200000,
      paidAt: daysFromNow(-11),
      method: "Card",
      reference: "TRX-KASBA-1007",
    },
    {
      invoiceId: inv4._id,
      amountCents: 700000,
      paidAt: daysFromNow(-19),
      method: "Cash",
      reference: "TRX-AMRANI-1003",
    },
  ]);

  await Expense.create([
    {
      userId: uid,
      vendor: "Figma",
      category: "SOFTWARE",
      status: "PAID",
      amountCents: 15000,
      currency: "EUR",
      incurredAt: daysFromNow(-12),
      notes: "Design collaboration plan",
      projectId: p0._id,
      clientId: c0._id,
    },
    {
      userId: uid,
      vendor: "Meta Ads",
      category: "MARKETING",
      status: "APPROVED",
      amountCents: 220000,
      currency: "MAD",
      incurredAt: daysFromNow(-8),
      projectId: p1._id,
      clientId: c1._id,
    },
    {
      userId: uid,
      vendor: "AWS",
      category: "SOFTWARE",
      status: "PAID",
      amountCents: 39000,
      currency: "USD",
      incurredAt: daysFromNow(-5),
      projectId: p2._id,
      clientId: c2._id,
    },
    {
      userId: uid,
      vendor: "Train tickets",
      category: "TRAVEL",
      status: "PAID",
      amountCents: 8000,
      currency: "EUR",
      incurredAt: daysFromNow(-3),
      notes: "Client meeting in Rabat",
      clientId: c1._id,
    },
  ]);

  await Interaction.create([
    { userId: uid, clientId: c0._id, type: "MEETING", title: "Weekly growth sync", note: "Approved checkout experiment", date: daysFromNow(-2) },
    { userId: uid, clientId: c0._id, type: "EMAIL", title: "Sent sprint update", date: daysFromNow(-1) },
    { userId: uid, clientId: c1._id, type: "PROPOSAL", title: "Sent revised brand proposal", date: daysFromNow(-6) },
    { userId: uid, clientId: c2._id, type: "CALL", title: "API architecture call", date: daysFromNow(-4) },
    { userId: uid, clientId: c3._id, type: "NOTE", title: "Lead qualification note", note: "Waiting for brief details", date: daysFromNow(-12) },
    { userId: uid, clientId: c4._id, type: "PAYMENT", title: "Final payment confirmed", date: daysFromNow(-19) },
    { userId: uid, clientId: c5._id, type: "EMAIL", title: "Follow-up on quote", date: daysFromNow(-2) },
  ]);

  await AutomationWorkflow.create([
    {
      userId: uid,
      name: "Invoice overdue reminder",
      description: "When an invoice is overdue, create a reminder interaction.",
      trigger: "INVOICE_OVERDUE",
      action: "LOG_INTERACTION",
      enabled: true,
      config: { delayHours: 12 },
    },
    {
      userId: uid,
      name: "New lead ping",
      description: "Notify in app when a new lead appears.",
      trigger: "NEW_LEAD",
      action: "NOTIFY_IN_APP",
      enabled: true,
      config: {},
    },
  ]);

  await MessageTemplate.create([
    {
      userId: uid,
      name: "Payment reminder",
      slug: "payment-reminder",
      channel: "EMAIL",
      body: "Hello {{clientName}}, this is a gentle reminder that invoice {{invoiceNumber}} is due. Please let me know if you need anything.",
    },
    {
      userId: uid,
      name: "Proposal follow-up",
      slug: "proposal-follow-up",
      channel: "EMAIL",
      body: "Hi {{clientName}}, just following up on the proposal shared earlier this week. Happy to walk through any section together.",
    },
  ]);
}
