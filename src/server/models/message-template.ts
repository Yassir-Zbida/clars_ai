import mongoose from 'mongoose';

export const templateChannelValues = ['EMAIL', 'LINKEDIN', 'SMS', 'NOTE', 'PROPOSAL'] as const;

const messageTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    /** Short handle for UI / future merging, unique per user */
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 64 },
    channel: { type: String, enum: templateChannelValues, default: 'EMAIL' },
    body: { type: String, required: true, maxlength: 16000 },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

messageTemplateSchema.index({ userId: 1, deletedAt: 1 });
messageTemplateSchema.index({ userId: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const MessageTemplate =
  mongoose.models?.MessageTemplate ?? mongoose.model('MessageTemplate', messageTemplateSchema);
