import mongoose from 'mongoose';
import { getDb } from '@/server/db';
import { Client } from '@/server/models/client';
import { requireUserId } from '../_lib';

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const authRes = await requireUserId();
  if ('error' in authRes) return authRes.error;

  await getDb();
  const rows = await Client.find({
    userId: new mongoose.Types.ObjectId(authRes.userId),
    deletedAt: { $in: [null, undefined] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const headers = ['id', 'fullName', 'email', 'phone', 'company', 'status', 'source', 'currency', 'totalRevenue', 'tags'];
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      [
        String(row._id),
        csvEscape(row.fullName),
        csvEscape(row.email),
        csvEscape(row.phone),
        csvEscape(row.company),
        csvEscape(row.status),
        csvEscape(row.source),
        csvEscape(row.currency),
        csvEscape(row.totalRevenue),
        csvEscape(Array.isArray(row.tags) ? row.tags.join('|') : ''),
      ].join(',')
    ),
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="clients.csv"',
    },
  });
}
