import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String },
    phone: { type: String },
    jobTitle: { type: String },
    isPrimary: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.clientId = (ret.clientId as { toString(): string } | undefined)?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

contactSchema.index({ clientId: 1, createdAt: -1 });

export const Contact = mongoose.models?.Contact ?? mongoose.model('Contact', contactSchema);
