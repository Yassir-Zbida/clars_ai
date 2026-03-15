import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    amountCents: { type: Number, required: true },
    paidAt: { type: Date, default: Date.now },
    method: { type: String },
    reference: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.invoiceId = (ret.invoiceId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

paymentSchema.index({ invoiceId: 1 });

export const Payment =
  mongoose.models?.Payment ?? mongoose.model('Payment', paymentSchema);
