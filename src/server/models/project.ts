import mongoose from 'mongoose';

const projectStatusEnum = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;
const projectPriorityEnum = ['LOW', 'MEDIUM', 'HIGH'] as const;

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    /** @deprecated Kept for backward compatibility; synced to first assigned contact */
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    assignedClientIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
      default: [],
    },
    name: { type: String, required: true },
    description: { type: String },
    notes: { type: String },
    status: { type: String, enum: projectStatusEnum, default: 'ACTIVE' },
    priority: { type: String, enum: projectPriorityEnum, default: 'MEDIUM' },
    progress: { type: Number, min: 0, max: 100 },
    startDate: { type: Date },
    endDate: { type: Date },
    budgetCents: { type: Number },
    currency: { type: String, default: 'EUR' },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString();
        ret.clientId = (ret.clientId as { toString(): string } | undefined)?.toString();
        const assigned = ret.assignedClientIds as mongoose.Types.ObjectId[] | undefined;
        ret.assignedClientIds = Array.isArray(assigned)
          ? assigned.map((x) => x.toString())
          : [];
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectSchema.index({ userId: 1, deletedAt: 1 });
projectSchema.index({ clientId: 1 });
projectSchema.index({ userId: 1, assignedClientIds: 1 });
projectSchema.index({ userId: 1, status: 1 });
projectSchema.index({ userId: 1, priority: 1 });

export const Project =
  mongoose.models?.Project ?? mongoose.model('Project', projectSchema);
