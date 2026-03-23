import mongoose from 'mongoose';

const expenseCategoryEnum = [
  'SOFTWARE',
  'TRAVEL',
  'MEALS',
  'OFFICE',
  'MARKETING',
  'PROFESSIONAL',
  'OTHER',
] as const;

const expenseStatusEnum = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;

const expenseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vendor: { type: String, trim: true },
    category: { type: String, enum: expenseCategoryEnum, default: 'OTHER' },
    status: { type: String, enum: expenseStatusEnum, default: 'PENDING' },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    incurredAt: { type: Date, required: true, default: Date.now },
    notes: { type: String },
    receiptUrl: { type: String },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString();
        ret.projectId = (ret.projectId as { toString(): string } | undefined)?.toString();
        ret.clientId = (ret.clientId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

expenseSchema.index({ userId: 1, deletedAt: 1 });
expenseSchema.index({ userId: 1, incurredAt: -1 });
expenseSchema.index({ userId: 1, category: 1 });

export const Expense =
  mongoose.models?.Expense ?? mongoose.model('Expense', expenseSchema);
