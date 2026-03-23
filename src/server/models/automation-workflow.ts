import mongoose from 'mongoose';

export const workflowTriggerValues = [
  'NEW_LEAD',
  'INVOICE_OVERDUE',
  'PAYMENT_RECEIVED',
  'PROJECT_COMPLETED',
  'CONTACT_AT_RISK',
] as const;

export const workflowActionValues = [
  'NOTIFY_IN_APP',
  'LOG_INTERACTION',
  'EMAIL_TEMPLATE',
  'NONE',
] as const;

const workflowSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    trigger: { type: String, enum: workflowTriggerValues, required: true },
    action: { type: String, enum: workflowActionValues, default: 'NOTIFY_IN_APP' },
    enabled: { type: Boolean, default: true },
    /** Future: template id, delay minutes, conditions */
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
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

workflowSchema.index({ userId: 1, deletedAt: 1 });
workflowSchema.index({ userId: 1, name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

export const AutomationWorkflow =
  mongoose.models?.AutomationWorkflow ??
  mongoose.model('AutomationWorkflow', workflowSchema);
