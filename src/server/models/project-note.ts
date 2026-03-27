import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    title:   { type: String, maxlength: 300 },
    content: { type: String, required: true, maxlength: 20000 },
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

noteSchema.index({ projectId: 1, userId: 1 })

export const ProjectNote =
  mongoose.models?.ProjectNote ?? mongoose.model('ProjectNote', noteSchema)
