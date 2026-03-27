import mongoose from 'mongoose'

const taskSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    title:       { type: String, required: true, maxlength: 300 },
    description: { type: String, maxlength: 4000 },
    status:   { type: String, enum: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'], default: 'TODO' },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'],        default: 'MEDIUM' },
    dueDate:  { type: Date },
    order:    { type: Number, default: 0 },
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

taskSchema.index({ projectId: 1, userId: 1, status: 1 })
taskSchema.index({ projectId: 1, order: 1 })

export const ProjectTask =
  mongoose.models?.ProjectTask ?? mongoose.model('ProjectTask', taskSchema)
