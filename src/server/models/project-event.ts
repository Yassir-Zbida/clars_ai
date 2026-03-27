import mongoose from 'mongoose'

const eventTypeEnum = ['MEETING', 'DEADLINE', 'MILESTONE', 'CALL', 'OTHER'] as const

const eventSchema = new mongoose.Schema(
  {
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    title:       { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 4000 },
    date:        { type: Date, required: true },
    type:        { type: String, enum: eventTypeEnum, default: 'OTHER' },
    completed:   { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id        = (ret._id as { toString(): string }).toString()
        ret.projectId = (ret.projectId as { toString(): string } | undefined)?.toString()
        ret.userId    = (ret.userId    as { toString(): string } | undefined)?.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

eventSchema.index({ projectId: 1, userId: 1, date: 1 })

export const ProjectEvent =
  mongoose.models?.ProjectEvent ?? mongoose.model('ProjectEvent', eventSchema)
