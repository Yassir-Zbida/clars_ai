import mongoose from 'mongoose';
import { Client } from '@/server/models/client';
import { Interaction } from '@/server/models/interaction';

const sampleClients = [
  { fullName: 'Yassine El Idrissi', company: 'Atlas Ecom Studio', type: 'COMPANY', currency: 'MAD', status: 'ACTIVE', source: 'REFERRAL', tags: ['e-commerce', 'long-term'], healthScore: 84, healthLabel: 'STRONG' },
  { fullName: 'Sophie Martin', company: 'Maison Martin', type: 'COMPANY', currency: 'EUR', status: 'QUALIFIED', source: 'LINKEDIN', tags: ['logo'], healthScore: 66, healthLabel: 'NEUTRAL' },
  { fullName: 'Adam Johnson', company: 'BrightRoute', type: 'COMPANY', currency: 'USD', status: 'PROPOSAL', source: 'WEBSITE', tags: ['wordpress'], healthScore: 59, healthLabel: 'NEUTRAL' },
  { fullName: 'Nour Alami', company: '', type: 'INDIVIDUAL', currency: 'MAD', status: 'LEAD', source: 'SOCIAL', tags: ['arabic-site'], healthScore: 37, healthLabel: 'AT_RISK' },
  { fullName: 'Karim Bensalem', company: 'Casablanca Growth', type: 'COMPANY', currency: 'EUR', status: 'ACTIVE', source: 'UPWORK', tags: ['urgent', 'e-commerce'], healthScore: 74, healthLabel: 'STRONG' },
  { fullName: 'Emma Dupont', company: '', type: 'INDIVIDUAL', currency: 'EUR', status: 'INACTIVE', source: 'COLD_OUTREACH', tags: ['logo'], healthScore: 32, healthLabel: 'AT_RISK' },
  { fullName: 'Hassan Al Farsi', company: 'Farsi Digital', type: 'COMPANY', currency: 'SAR', status: 'ARCHIVED', source: 'OTHER', tags: ['arabic-site', 'long-term'], healthScore: 48, healthLabel: 'NEUTRAL' },
  { fullName: 'Leila Benyahia', company: 'Luna Création', type: 'COMPANY', currency: 'EUR', status: 'QUALIFIED', source: 'REFERRAL', tags: ['wordpress', 'urgent'], healthScore: 71, healthLabel: 'STRONG' },
  { fullName: 'Omar Khaled', company: '', type: 'INDIVIDUAL', currency: 'USD', status: 'LEAD', source: 'SOCIAL', tags: ['e-commerce'], healthScore: 41, healthLabel: 'NEUTRAL' },
  { fullName: 'James O\'Connor', company: 'Northline Studio', type: 'COMPANY', currency: 'GBP', status: 'ACTIVE', source: 'WEBSITE', tags: ['long-term', 'logo'], healthScore: 77, healthLabel: 'STRONG' },
] as const;

const interactionTypes = ['EMAIL', 'CALL', 'MEETING', 'NOTE', 'PROPOSAL', 'INVOICE', 'PAYMENT', 'MILESTONE'] as const;

export async function seedClientsForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }
  const userObjectId = new mongoose.Types.ObjectId(userId);
  await Client.deleteMany({ userId: userObjectId, isArchived: { $ne: true } });

  for (let idx = 0; idx < sampleClients.length; idx += 1) {
    const item = sampleClients[idx];
    const revenue = Math.round(500 + Math.random() * 50000);
    const paid = Math.round(revenue * (0.55 + Math.random() * 0.4));
    const unpaid = Math.max(0, revenue - paid);
    const overdue = Math.round(unpaid * Math.random() * 0.5);
    const client = await Client.create({
      userId: userObjectId,
      fullName: item.fullName,
      company: item.company || undefined,
      type: item.type,
      status: item.status,
      source: item.source,
      language: idx % 3 === 0 ? 'AR' : idx % 2 === 0 ? 'EN' : 'FR',
      currency: item.currency,
      tags: item.tags,
      totalRevenue: revenue,
      totalPaid: paid,
      totalUnpaid: unpaid,
      totalOverdue: overdue,
      healthScore: item.healthScore,
      healthLabel: item.healthLabel,
      healthUpdatedAt: new Date(),
      isFavorite: idx % 4 === 0,
      lastContactAt: new Date(Date.now() - (idx + 1) * 86400000 * 3),
    });

    const count = 3 + (idx % 3);
    for (let i = 0; i < count; i += 1) {
      const type = interactionTypes[(idx + i) % interactionTypes.length];
      const date = new Date(Date.now() - (i + 1) * 86400000 * (idx + 1));
      await Interaction.create({
        clientId: client._id,
        userId: userObjectId,
        type,
        title: `${type} touchpoint`,
        note: `Seeded interaction ${i + 1} for ${item.fullName}`,
        date,
      });
    }
  }
}
