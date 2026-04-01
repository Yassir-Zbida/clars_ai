import mongoose from "mongoose"

const eventTypeEnum = ["api", "page_view"] as const
const surfaceEnum = ["chat", "email", "reports"] as const

export type AiUsageEventType = (typeof eventTypeEnum)[number]
export type AiUsageSurface = (typeof surfaceEnum)[number]

const aiUsageEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    eventType: { type: String, enum: eventTypeEnum, required: true, index: true },
    surface: { type: String, enum: surfaceEnum, required: true, index: true },
    model: { type: String, trim: true, maxlength: 120 },
    mock: { type: Boolean },
    promptTokens: { type: Number, min: 0 },
    completionTokens: { type: Number, min: 0 },
    totalTokens: { type: Number, min: 0 },
    durationMs: { type: Number, min: 0, default: 0 },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString()
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

aiUsageEventSchema.index({ createdAt: -1 })
aiUsageEventSchema.index({ eventType: 1, surface: 1, createdAt: -1 })

export const AiUsageEvent =
  mongoose.models?.AiUsageEvent ?? mongoose.model("AiUsageEvent", aiUsageEventSchema)
