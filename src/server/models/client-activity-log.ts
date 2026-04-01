import mongoose from "mongoose"

export const clientActivityLogTypes = ["navigation", "action", "error", "api", "info"] as const
export type ClientActivityLogType = (typeof clientActivityLogTypes)[number]

export const clientActivityLogLevels = ["debug", "info", "warn", "error"] as const
export type ClientActivityLogLevel = (typeof clientActivityLogLevels)[number]

const clientActivityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userEmail: { type: String, trim: true, maxlength: 320 },
    sessionId: { type: String, trim: true, maxlength: 64, index: true },
    type: { type: String, enum: clientActivityLogTypes, required: true, index: true },
    level: { type: String, enum: clientActivityLogLevels, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, trim: true, maxlength: 800 },
    path: { type: String, trim: true, maxlength: 600 },
    meta: { type: mongoose.Schema.Types.Mixed },
    userAgent: { type: String, trim: true, maxlength: 400 },
    clientTs: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
)

clientActivityLogSchema.index({ createdAt: -1 })
clientActivityLogSchema.index({ type: 1, createdAt: -1 })

export const ClientActivityLog =
  mongoose.models?.ClientActivityLog ?? mongoose.model("ClientActivityLog", clientActivityLogSchema)
