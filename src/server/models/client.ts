import mongoose from 'mongoose';

const clientTypeEnum = ['INDIVIDUAL', 'COMPANY'] as const;
const clientStatusEnum = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
const clientSourceEnum = ['REFERRAL', 'LINKEDIN', 'UPWORK', 'WEBSITE', 'COLD_OUTREACH', 'SOCIAL', 'OTHER'] as const;
const clientLangEnum = ['FR', 'EN', 'AR'] as const;
const healthLabelEnum = ['STRONG', 'NEUTRAL', 'AT_RISK'] as const;

const clientSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String },
    phone: { type: String },
    avatarUrl: { type: String },
    company: { type: String },
    jobTitle: { type: String },
    website: { type: String },
    birthday: { type: Date },
    type: { type: String, enum: clientTypeEnum, default: 'INDIVIDUAL' },
    status: { type: String, enum: clientStatusEnum, default: 'LEAD' },
    source: { type: String, enum: clientSourceEnum },
    industry: { type: String },
    language: { type: String, enum: clientLangEnum, default: 'FR' },
    country: { type: String },
    city: { type: String },
    address: { type: String },
    timezone: { type: String },
    currency: { type: String, default: 'EUR' },
    defaultRate: { type: Number },
    totalRevenue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalUnpaid: { type: Number, default: 0 },
    totalOverdue: { type: Number, default: 0 },
    healthLabel: { type: String, enum: healthLabelEnum },
    healthUpdatedAt: { type: Date },
    healthSummary: { type: String },
    firstContactAt: { type: Date },
    lastContactAt: { type: Date },
    nextFollowUpAt: { type: Date },
    notes: { type: String },
    tags: { type: [String], default: [] },
    isArchived: { type: Boolean, default: false },
    isFavorite: { type: Boolean, default: false },
    healthScore: { type: Number },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = (ret._id as { toString(): string }).toString();
        ret.userId = (ret.userId as { toString(): string } | undefined)?.toString();
        ret.name = ret.fullName;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

clientSchema.index({ userId: 1, deletedAt: 1 });
clientSchema.index({ userId: 1, isArchived: 1, status: 1 });
clientSchema.index({ userId: 1, fullName: 1 });
clientSchema.index({ userId: 1, birthday: 1 });
clientSchema.index({ tags: 1 });

export const Client =
  mongoose.models?.Client ?? mongoose.model('Client', clientSchema);
