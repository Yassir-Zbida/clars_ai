import mongoose from 'mongoose';

const invoiceStatusEnum = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
] as const;

const invoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    number: { type: String, required: true, unique: true },
    status: { type: String, enum: invoiceStatusEnum, default: 'DRAFT' },
    amountCents: { type: Number, required: true },
    currency: { type: String, default: 'EUR' },
    dueDate: { type: Date, required: true },
    issuedAt: { type: Date, default: Date.now },
    notes: { type: String },
    pdfStorageKey: { type: String },
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
        ret.projectId = (ret.projectId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

invoiceSchema.index({ userId: 1, deletedAt: 1 });
invoiceSchema.index({ clientId: 1 });

export const Invoice =
  mongoose.models?.Invoice ?? mongoose.model('Invoice', invoiceSchema);
