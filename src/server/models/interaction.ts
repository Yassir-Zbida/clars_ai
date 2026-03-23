import mongoose from 'mongoose';

const interactionTypeEnum = ['EMAIL', 'CALL', 'MEETING', 'NOTE', 'PROPOSAL', 'INVOICE', 'PAYMENT', 'MILESTONE'] as const;

const interactionSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: interactionTypeEnum, required: true },
    title: { type: String, required: true },
    note: { type: String },
    date: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.clientId = (ret.clientId as { toString(): string } | undefined)?.toString();
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

interactionSchema.index({ clientId: 1, date: -1 });
interactionSchema.index({ userId: 1, createdAt: -1 });

export const Interaction =
  mongoose.models?.Interaction ?? mongoose.model('Interaction', interactionSchema);
