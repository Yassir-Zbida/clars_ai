"use client"

import { useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { formatCents } from "@/lib/money"

const queryClient = new QueryClient()

type LineItem = { description: string; quantity: number; unitAmountCents: number }

type InvoiceDetail = {
  id: string
  number: string
  documentType: string
  title?: string | null
  status: string
  amountCents: number
  paidCents: number
  balanceCents: number
  taxRatePercent?: number | null
  currency: string
  dueDate: string
  issuedAt: string
  notes?: string | null
  clientId: string
  clientName?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  clientCompany?: string | null
  lineItems: LineItem[]
}

type UserProfile = {
  name: string
  email: string
  companyName: string
  companyTagline: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  companyWebsite: string
  taxId: string
  paymentInfo: string
  signatureText: string
  signatureDataUrl: string
  logoDataUrl: string
}

// App primary color
const PRIMARY = "#497dcb"
// Light gray for header/footer bands (matches app --background: #f5f6fa)
const BAND_BG  = "#f5f6fa"
const BAND_BORDER = "#e2e5ef"

function PrintPage() {
  const params = useParams()
  const id = typeof params.id === "string" ? params.id : ""
  const didPrint = useRef(false)

  const { data: inv, isLoading: invLoading, isError: invError } = useQuery({
    queryKey: ["print-invoice", id],
    queryFn: async () => {
      const res = await fetch(`/api/invoices/${id}`, { credentials: "include" })
      if (!res.ok) throw new Error("load")
      return ((await res.json()) as { data: InvoiceDetail }).data
    },
    enabled: Boolean(id),
  })

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["print-profile", id],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch(`/api/user/me?t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) return null
      return ((await res.json()) as { data: UserProfile }).data
    },
  })

  const isLoading = invLoading || profileLoading

  useEffect(() => {
    if (inv && profile !== undefined && !didPrint.current) {
      didPrint.current = true
      setTimeout(() => window.print(), 450)
    }
  }, [inv, profile])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        Preparing document…
      </div>
    )
  }

  if (invError || !inv) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Document not found.
      </div>
    )
  }

  const isQuote   = inv.documentType === "QUOTE"
  const subtotal  = inv.lineItems.length
    ? inv.lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitAmountCents), 0)
    : inv.amountCents
  const taxRate   = inv.taxRatePercent ?? 0
  const taxAmount = Math.round(subtotal * (taxRate / 100))
  const total     = subtotal + taxAmount

  const rawSig = profile?.signatureDataUrl?.trim() ?? ""
  const hasDrawnSig = rawSig.startsWith("data:image")

  const biz = {
    name:             profile?.companyName      || profile?.name    || "",
    tagline:          profile?.companyTagline   || "",
    address:          profile?.companyAddress   || "",
    phone:            profile?.companyPhone     || "",
    email:            profile?.companyEmail     || profile?.email   || "",
    website:          profile?.companyWebsite   || "",
    taxId:            profile?.taxId            || "",
    paymentInfo:      profile?.paymentInfo      || "",
    /* Never fall back to display name — that looked like a fake "signature" */
    signatureText:    (profile?.signatureText ?? "").trim(),
    signatureDataUrl: hasDrawnSig ? rawSig : "",
    logoDataUrl:      profile?.logoDataUrl?.trim() || "",
  }

  return (
    <>
      {/* Screen toolbar — hidden on print */}
      <div className="no-print fixed right-4 top-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          style={{ backgroundColor: PRIMARY }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white shadow transition hover:opacity-90"
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow hover:bg-gray-50"
        >
          Close
        </button>
      </div>

      {/* Screen wrapper */}
      <div className="screen-wrapper">
        {/* A4 document */}
        <div className="a4-doc">

          {/* ── HEADER BAND — light gray ── */}
          <div className="header-band">
            {/* Left: company */}
            <div className="header-left">
              <div className="brand-row">
                {biz.logoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={biz.logoDataUrl} alt="logo" className="brand-logo" />
                ) : (
                  <div className="brand-icon" style={{ backgroundColor: PRIMARY }}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                      <path d="M4 10l5 5 7-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="company-name">{biz.name || "Your Company"}</div>
                  {biz.tagline && <div className="company-tagline">{biz.tagline}</div>}
                </div>
              </div>
              <div className="company-details">
                {biz.address && biz.address.split("\n").map((l, i) => <div key={i}>{l}</div>)}
                <div className="contact-row">
                  {biz.phone   && <span>Tel: {biz.phone}</span>}
                  {biz.email   && <span>Email: {biz.email}</span>}
                  {biz.website && <span>{biz.website}</span>}
                </div>
                {biz.taxId && <div>Tax ID: {biz.taxId}</div>}
              </div>
            </div>

            {/* Right: invoice meta */}
            <div className="header-right">
              <div className="doc-type">{isQuote ? "QUOTE" : "INVOICE"}</div>
              <div className="ref-number">Ref No. {inv.number}</div>
              <div className="meta-grid">
                <span className="meta-label">Issue Date</span>
                <span className="meta-value">{fmt(inv.issuedAt)}</span>
                <span className="meta-label">Due Date</span>
                <span className={`meta-value${isDue(inv.dueDate, inv.status) ? " overdue" : ""}`}>
                  {fmt(inv.dueDate)}
                </span>
              </div>
              <div
                className="status-badge"
                style={{ backgroundColor: statusBg(inv.status), color: statusColor(inv.status) }}
              >
                {inv.status.replace(/_/g, " ")}
              </div>
            </div>
          </div>

          {/* ── BILL TO / SUBJECT ── */}
          <div className="bill-section">
            <div className="bill-to">
              <div className="section-label" style={{ color: PRIMARY }}>Billed To</div>
              <div className="client-name">{inv.clientName || "—"}</div>
              {inv.clientCompany && <div className="client-detail">{inv.clientCompany}</div>}
              {inv.clientEmail   && <div className="client-detail">{inv.clientEmail}</div>}
              {inv.clientPhone   && <div className="client-detail">{inv.clientPhone}</div>}
            </div>
            {inv.title ? (
              <div className="subject-col">
                <div className="section-label" style={{ color: PRIMARY }}>Subject</div>
                <div className="subject-text">{inv.title}</div>
              </div>
            ) : <div />}
          </div>

          {/* ── LINE ITEMS ── */}
          <div className="table-wrap">
           <div className="table-inner">
            <table className="items-table">
              <thead>
                <tr style={{ backgroundColor: PRIMARY }}>
                  <th className="th-no">No.</th>
                  <th className="th-desc">Description</th>
                  <th className="th-qty">Qty</th>
                  <th className="th-price">Unit Price ({inv.currency})</th>
                  <th className="th-amount">Amount ({inv.currency})</th>
                </tr>
              </thead>
              <tbody>
                {inv.lineItems.length > 0
                  ? inv.lineItems.map((row, i) => (
                      <tr key={i} className={i % 2 === 1 ? "row-alt" : ""}>
                        <td className="td-no">{i + 1}</td>
                        <td className="td-desc">{row.description}</td>
                        <td className="td-qty">{row.quantity}</td>
                        <td className="td-price">{formatCents(row.unitAmountCents, inv.currency)}</td>
                        <td className="td-amount">{formatCents(Math.round(row.quantity * row.unitAmountCents), inv.currency)}</td>
                      </tr>
                    ))
                  : (
                    <tr>
                      <td className="td-no">1</td>
                      <td className="td-desc">{inv.title || "Services rendered"}</td>
                      <td className="td-qty">1</td>
                      <td className="td-price">{formatCents(inv.amountCents, inv.currency)}</td>
                      <td className="td-amount">{formatCents(inv.amountCents, inv.currency)}</td>
                    </tr>
                  )
                }
              </tbody>
            </table>
           </div>
          </div>

          {/* ── TOTALS ── */}
          <div className="totals-wrap">
            <div className="totals-box">
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatCents(subtotal, inv.currency)}</span>
              </div>
              {taxRate > 0 && (
                <div className="total-row">
                  <span>Tax (VAT {taxRate}%)</span>
                  <span>{formatCents(taxAmount, inv.currency)}</span>
                </div>
              )}
              {!isQuote && inv.paidCents > 0 && (
                <div className="total-row collected">
                  <span>Collected</span>
                  <span>{formatCents(inv.paidCents, inv.currency)}</span>
                </div>
              )}
              <div className="total-due" style={{ backgroundColor: PRIMARY }}>
                <span>{!isQuote && inv.paidCents > 0 ? "Balance Due" : "Amount Due"}</span>
                <span>{formatCents(!isQuote && inv.paidCents > 0 ? inv.balanceCents : total, inv.currency)}</span>
              </div>
            </div>
          </div>

          {/* ── BANK / PAYMENT INFO ── */}
          {biz.paymentInfo && (
            <div className="bank-section">
              <div className="section-label-gray">Bank &amp; Payment Info</div>
              <div className="bank-box">{biz.paymentInfo}</div>
            </div>
          )}

          {/* ── SIGNATURE ── */}
          {(biz.signatureDataUrl || biz.signatureText) && (
            <div className="sig-section">
              <div className="sig-wrap">
                <div className="sig-line" />
                {biz.signatureDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={biz.signatureDataUrl} alt="" className="sig-img" />
                ) : (
                  <div className="sig-text">{biz.signatureText}</div>
                )}
                <div className="sig-label">Authorized Signature</div>
              </div>
            </div>
          )}

          {/* ── NOTES ── */}
          {inv.notes && (
            <div className="notes-section">
              <div className="section-label-gray">Notes</div>
              <div className="notes-box">{inv.notes}</div>
            </div>
          )}

          {/* Spacer pushes footer to bottom */}
          <div className="flex-spacer" />

          {/* ── FOOTER BAND ── */}
          <div className="footer-band">
            <span className="footer-left">
              <span className="footer-brand">Generated by Clars.ai</span>
              <span className="footer-sep">·</span>
              <span>Thank you for your business.</span>
            </span>
            <span className="footer-right">
              {biz.email   && <span>Email: {biz.email}</span>}
              {biz.website && <span>Website: {biz.website}</span>}
              {biz.phone   && <span>Tel: {biz.phone}</span>}
            </span>
          </div>

        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { font-family: 'Inter', sans-serif; background: #eef0f5; }

        /* ── Screen layout ── */
        .screen-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 48px 16px 48px;
          background: #eef0f5;
        }

        /* A4: 794px wide, min 1123px tall (210mm × 297mm at 96dpi) */
        .a4-doc {
          width: 794px;
          min-height: 1123px;
          background: #fff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          display: flex;
          flex-direction: column;
        }

        /* ── HEADER ── */
        .header-band {
          background: ${BAND_BG};
          border-bottom: 1px solid ${BAND_BORDER};
          padding: 32px 48px 28px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
        }
        .header-left { display: flex; flex-direction: column; gap: 12px; }
        .brand-row { display: flex; align-items: center; gap: 10px; }
        .brand-icon {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .brand-logo {
          max-height: 48px; max-width: 120px; object-fit: contain; flex-shrink: 0;
        }
        .company-name { font-size: 18px; font-weight: 700; color: #0f0f18; line-height: 1.1; }
        .company-tagline { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .company-details { font-size: 11px; color: #6b7280; line-height: 1.7; }
        .contact-row { display: flex; flex-wrap: wrap; gap: 12px; padding-top: 2px; }

        .header-right { text-align: right; flex-shrink: 0; }
        .doc-type {
          font-size: 32px; font-weight: 800; letter-spacing: 0.12em;
          color: #d1d5db; text-transform: uppercase; line-height: 1;
        }
        .ref-number { font-size: 13px; font-weight: 600; color: #111827; margin-top: 6px; }
        .meta-grid {
          display: grid; grid-template-columns: auto auto;
          gap: 2px 20px; margin-top: 10px; text-align: right; font-size: 11px;
        }
        .meta-label { color: #9ca3af; }
        .meta-value { color: #374151; font-weight: 500; }
        .meta-value.overdue { color: #dc2626; font-weight: 600; }
        .status-badge {
          display: inline-block; margin-top: 10px; border-radius: 999px;
          padding: 2px 10px; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* ── BILL TO / SUBJECT ── */
        .bill-section {
          display: grid; grid-template-columns: 1fr 1fr;
          border-bottom: 1px solid #f1f3f7; padding: 20px 48px;
        }
        .bill-to { padding-right: 24px; }
        .subject-col { border-left: 1px solid #f1f3f7; padding-left: 24px; }
        .section-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; margin-bottom: 6px;
        }
        .section-label-gray {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; margin-bottom: 6px; color: #9ca3af;
        }
        .client-name { font-size: 14px; font-weight: 600; color: #111827; }
        .client-detail { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .subject-text { font-size: 13px; color: #374151; }

        /* ── TABLE ── */
        .table-wrap { padding: 16px 48px 0; }
        .table-inner { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
        .items-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .items-table thead tr th {
          color: #fff; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 9px 10px;
        }
        .th-no   { text-align: left;   width: 32px; padding-left: 14px !important; }
        .th-desc { text-align: left; }
        .th-qty  { text-align: right; width: 50px; }
        .th-price  { text-align: right; width: 120px; }
        .th-amount { text-align: right; width: 120px; padding-right: 14px !important; }
        .items-table tbody tr td { padding: 11px 10px; border-bottom: 1px solid #f3f4f6; }
        .items-table tbody tr.row-alt { background: #fafafa; }
        .td-no     { text-align: center; color: #9ca3af; font-size: 11px; padding-left: 14px !important; }
        .td-desc   { color: #111827; }
        .td-qty    { text-align: right; color: #6b7280; }
        .td-price  { text-align: right; color: #6b7280; }
        .td-amount { text-align: right; font-weight: 600; color: #111827; padding-right: 14px !important; }

        /* ── TOTALS ── */
        .totals-wrap { display: flex; justify-content: flex-end; padding: 14px 48px 0; }
        .totals-box { width: 240px; }
        .total-row {
          display: flex; justify-content: space-between;
          font-size: 12px; color: #6b7280; padding: 4px 0;
        }
        .total-row.collected span:last-child { color: #059669; }
        .total-due {
          display: flex; justify-content: space-between;
          color: #fff; font-size: 13px; font-weight: 700;
          padding: 8px 12px; border-radius: 6px; margin-top: 6px;
        }

        /* ── BANK INFO ── */
        .bank-section { padding: 20px 48px 0; }
        .bank-box {
          font-size: 11px; color: #4b5563; line-height: 1.8; white-space: pre-line;
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px;
        }

        /* ── SIGNATURE ── */
        .sig-section { padding: 20px 48px 0; display: flex; justify-content: flex-end; }
        .sig-wrap { display: flex; flex-direction: column; align-items: flex-end; }
        .sig-line { width: 180px; height: 1px; background: #d1d5db; margin-bottom: 6px; }
        .sig-img  { max-height: 60px; max-width: 200px; object-fit: contain; }
        .sig-text {
          font-family: 'Brush Script MT', 'Comic Sans MS', cursive;
          font-size: 28px; color: #374151; line-height: 1.1;
        }
        .sig-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; margin-top: 3px; }

        /* ── NOTES ── */
        .notes-section { padding: 20px 48px 0; }
        .notes-box {
          font-size: 12px; color: #4b5563; white-space: pre-wrap;
          background: #f9fafb; border: 1px solid #e5e7eb;
          border-radius: 6px; padding: 10px 12px; line-height: 1.6;
        }

        /* Spacer — pushes footer to bottom */
        .flex-spacer { flex: 1; min-height: 24px; }

        /* ── FOOTER ── */
        .footer-band {
          background: ${BAND_BG};
          border-top: 1px solid ${BAND_BORDER};
          padding: 12px 48px;
          display: flex; align-items: center; justify-content: space-between;
          font-size: 10px; color: #6b7280;
        }
        .footer-left  { display: flex; align-items: center; gap: 6px; }
        .footer-brand { font-weight: 600; color: ${PRIMARY}; }
        .footer-sep   { color: #d1d5db; }
        .footer-right { display: flex; gap: 16px; }

        /* ── PRINT ── */
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            width: 210mm; height: 297mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: #fff;
          }
          .no-print { display: none !important; }
          .screen-wrapper {
            padding: 0; background: #fff;
            display: block; min-height: unset;
          }
          .a4-doc {
            width: 210mm; min-height: 297mm; height: 297mm;
            box-shadow: none;
          }
        }
      `}</style>
    </>
  )
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}
function isDue(date: string, status: string) {
  return status === "OVERDUE" || (!!date && new Date(date) < new Date() && !["PAID","CANCELLED"].includes(status))
}
function statusBg(s: string) {
  const m: Record<string, string> = {
    PAID: "#d1fae5", PARTIALLY_PAID: "#fef9c3", OVERDUE: "#fee2e2",
    SENT: "#dbeafe", DRAFT: "#e5e7eb", CANCELLED: "#e5e7eb", VIEWED: "#ede9fe",
  }
  return m[s] ?? "#e5e7eb"
}
function statusColor(s: string) {
  const m: Record<string, string> = {
    PAID: "#065f46", PARTIALLY_PAID: "#713f12", OVERDUE: "#991b1b",
    SENT: "#1e40af", DRAFT: "#374151", CANCELLED: "#374151", VIEWED: "#5b21b6",
  }
  return m[s] ?? "#374151"
}

export default function PrintInvoicePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrintPage />
    </QueryClientProvider>
  )
}
