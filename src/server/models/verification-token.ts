import mongoose from 'mongoose';

const verificationTokenSchema = new mongoose.Schema(
  {
    identifier: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  {
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

verificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

export const VerificationToken =
  mongoose.models?.VerificationToken ??
  mongoose.model('VerificationToken', verificationTokenSchema);
