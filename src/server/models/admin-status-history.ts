import mongoose from "mongoose"

const checkSnapSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    status: { type: String, enum: ["pass", "warn", "fail"], required: true },
    message: { type: String, maxlength: 400 },
    ms: { type: Number },
  },
  { _id: false }
)

const adminStatusHistorySchema = new mongoose.Schema(
  {
    overall: { type: String, enum: ["healthy", "warning", "degraded"], required: true },
    signature: { type: String, required: true, maxlength: 2000 },
    passCount: { type: Number, required: true },
    warnCount: { type: Number, required: true },
    failCount: { type: Number, required: true },
    checks: { type: [checkSnapSchema], required: true },
    recordedByEmail: { type: String, trim: true, lowercase: true, maxlength: 320 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString()
        ret.checkedAt = (ret.createdAt as Date | undefined)?.toISOString?.() ?? ret.createdAt
        delete ret._id
        delete ret.__v
        delete ret.signature
        return ret
      },
    },
  }
)

adminStatusHistorySchema.index({ createdAt: -1 })
/** Auto-remove snapshots older than 90 days (optional housekeeping). */
adminStatusHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const AdminStatusHistory =
  mongoose.models?.AdminStatusHistory ?? mongoose.model("AdminStatusHistory", adminStatusHistorySchema)
