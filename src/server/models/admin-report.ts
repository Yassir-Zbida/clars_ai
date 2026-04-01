import mongoose from "mongoose"

const adminReportSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    schedule: { type: String, required: true, trim: true, maxlength: 120 },
    /** Legacy name; optional free-text notes (not used for email). */
    destination: { type: String, trim: true, maxlength: 320, default: "" },
    status: { type: String, enum: ["active", "draft"], default: "draft" },
    createdByEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
    lastRunAt: { type: Date },
    lastRunSummary: { type: String, maxlength: 1000 },
    lastRunDetail: { type: String, maxlength: 14000 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

adminReportSchema.index({ createdAt: -1 })
adminReportSchema.index({ status: 1 })

// Next.js dev HMR reuses the process; an older AdminReport schema can stay cached and reject writes.
if (process.env.NODE_ENV !== "production" && mongoose.models.AdminReport) {
  delete mongoose.models.AdminReport
}

export const AdminReport =
  mongoose.models.AdminReport ?? mongoose.model("AdminReport", adminReportSchema)
