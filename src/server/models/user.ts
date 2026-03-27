import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, sparse: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String },
    passwordResetToken: { type: String },
    passwordResetTokenExpiry: { type: Date },
    deletedAt: { type: Date },
    /** Set when the user submits or skips the post-signup survey */
    onboardingSurveyCompletedAt: { type: Date },
    /** Raw survey payload (answers or `{ skipped: true }`) */
    onboardingSurvey: { type: mongoose.Schema.Types.Mixed },
    /** Preferred display currency for aggregated financial figures */
    defaultCurrency: { type: String, default: "USD", maxlength: 3 },
    /** Business / company profile shown on invoices */
    companyName:    { type: String, maxlength: 200 },
    companyTagline: { type: String, maxlength: 200 },
    companyAddress: { type: String, maxlength: 500 },
    companyPhone:   { type: String, maxlength: 50 },
    companyEmail:   { type: String, maxlength: 200 },
    companyWebsite: { type: String, maxlength: 200 },
    taxId:          { type: String, maxlength: 100 },
    paymentInfo:    { type: String, maxlength: 1000 },
    signatureText:    { type: String, maxlength: 100 },
    invoiceColor:     { type: String, maxlength: 7, default: "#497dcb" },
    /** base64 PNG of the drawn signature (stored as data-URL) */
    signatureDataUrl: { type: String },
    /** base64 image of company logo (stored as data-URL, resized client-side) */
    logoDataUrl:      { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1, deletedAt: 1 });

export const User =
  mongoose.models?.User ?? mongoose.model('User', userSchema);
