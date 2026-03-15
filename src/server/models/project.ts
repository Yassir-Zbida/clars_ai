import mongoose from 'mongoose';

const projectStatusEnum = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const;

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: projectStatusEnum, default: 'ACTIVE' },
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
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

projectSchema.index({ userId: 1, deletedAt: 1 });
projectSchema.index({ clientId: 1 });

export const Project =
  mongoose.models?.Project ?? mongoose.model('Project', projectSchema);
