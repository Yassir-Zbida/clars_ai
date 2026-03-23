import mongoose from 'mongoose';
import { Client } from '@/server/models/client';
import { Invoice } from '@/server/models/invoice';
import { Project } from '@/server/models/project';
import { Interaction } from '@/server/models/interaction';
import { Payment } from '@/server/models/payment';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function mapLabel(score: number): 'STRONG' | 'NEUTRAL' | 'AT_RISK' {
  if (score >= 70) return 'STRONG';
  if (score >= 40) return 'NEUTRAL';
  return 'AT_RISK';
}

export async function recalculateClientFinancials(clientId: mongoose.Types.ObjectId) {
  const invoices = (await Invoice.find({
    clientId,
    deletedAt: { $in: [null, undefined] },
  }).lean()) as Array<{ amountCents?: number; status?: string; dueDate?: Date; _id: mongoose.Types.ObjectId }>;

  const now = Date.now();
  let totalRevenue = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;
  let totalOverdue = 0;

  for (const invoice of invoices) {
    const amount = (invoice.amountCents ?? 0) / 100;
    totalRevenue += amount;
    const status = invoice.status ?? 'DRAFT';
    if (status === 'PAID') {
      totalPaid += amount;
    } else {
      totalUnpaid += amount;
      if (invoice.dueDate && new Date(invoice.dueDate).getTime() < now) {
        totalOverdue += amount;
      }
    }
  }

  await Client.updateOne(
    { _id: clientId },
    {
      $set: {
        totalRevenue,
        totalPaid,
        totalUnpaid,
        totalOverdue,
      },
    }
  );

  return { totalRevenue, totalPaid, totalUnpaid, totalOverdue };
}

export async function recalculateClientHealthScore(clientId: mongoose.Types.ObjectId) {
  const client = (await Client.findById(clientId).lean()) as
    | { _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; totalRevenue?: number; healthSummary?: string }
    | null;

  if (!client) return null;

  const [clientInvoices, avgRevenueAgg, lastInteraction, interactionCount, projectStats] = await Promise.all([
    Invoice.find({ clientId, deletedAt: { $in: [null, undefined] } })
      .select('status dueDate createdAt')
      .lean() as Promise<Array<{ _id: mongoose.Types.ObjectId; status?: string; dueDate?: Date; createdAt?: Date }>>,
    Client.aggregate<{ avg: number }>([
      { $match: { userId: client.userId, deletedAt: { $in: [null, undefined] } } },
      { $group: { _id: null, avg: { $avg: '$totalRevenue' } } },
    ]),
    Interaction.findOne({ clientId }).sort({ date: -1 }).lean() as Promise<{ date?: Date } | null>,
    Interaction.countDocuments({ clientId }),
    Project.aggregate<{ completed: number; cancelled: number; total: number }>([
      {
        $match: {
          deletedAt: { $in: [null, undefined] },
          $or: [{ clientId }, { assignedClientIds: clientId }],
        },
      },
      {
        $group: {
          _id: null,
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0],
            },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const paymentCount = await Payment.countDocuments({
    invoiceId: { $in: clientInvoices.map((invoice) => invoice._id) },
  });

  const paidInvoices = clientInvoices.filter((invoice) => invoice.status === 'PAID').length;
  const paymentRegularityScore = clientInvoices.length ? (paidInvoices / clientInvoices.length) * 100 : 50;

  const avgRevenue = avgRevenueAgg[0]?.avg ?? 0;
  const revenueVolumeScore = avgRevenue <= 0 ? 50 : Math.min(100, ((client.totalRevenue ?? 0) / avgRevenue) * 100);

  const daysSinceInteraction = lastInteraction?.date
    ? (Date.now() - new Date(lastInteraction.date).getTime()) / (1000 * 60 * 60 * 24)
    : 365;
  const recencyScore = daysSinceInteraction <= 30 ? 100 : Math.max(0, 100 - (daysSinceInteraction - 30) * 2);

  const project = projectStats[0];
  const completionRate = project?.total ? project.completed / project.total : 0.5;
  const projectScore = completionRate * 100;

  const interactionBaseline = Math.max(1, clientInvoices.length + paymentCount);
  const responseScore = Math.min(100, (interactionCount / interactionBaseline) * 100);

  const weightedScore =
    paymentRegularityScore * 0.3 +
    revenueVolumeScore * 0.2 +
    recencyScore * 0.2 +
    projectScore * 0.15 +
    responseScore * 0.15;

  const score = clampScore(weightedScore);
  const healthLabel = mapLabel(score);
  const healthSummary =
    healthLabel === 'STRONG'
      ? `Reliable client with healthy activity and payments. Last active ${Math.round(daysSinceInteraction)} days ago.`
      : healthLabel === 'NEUTRAL'
        ? `Client is moderately healthy with room to improve payment and engagement consistency.`
        : `Client needs attention: low engagement or payment delays indicate relationship risk.`;

  await Client.updateOne(
    { _id: clientId },
    {
      $set: {
        healthScore: score,
        healthLabel,
        healthUpdatedAt: new Date(),
        healthSummary,
        lastContactAt: lastInteraction?.date ?? undefined,
      },
    }
  );

  return {
    score,
    healthLabel,
    healthUpdatedAt: new Date(),
    healthSummary,
    factors: {
      paymentRegularityScore: clampScore(paymentRegularityScore),
      revenueVolumeScore: clampScore(revenueVolumeScore),
      recencyScore: clampScore(recencyScore),
      projectScore: clampScore(projectScore),
      responseScore: clampScore(responseScore),
    },
  };
}
