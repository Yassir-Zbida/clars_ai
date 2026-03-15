import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters';
import mongoose from 'mongoose';
import { getDb } from '@/server/db';
import { User } from '@/server/models/user';
import { Account } from '@/server/models/account';
import { Session } from '@/server/models/session';
import { VerificationToken as VerificationTokenModel } from '@/server/models/verification-token';

function toAdapterUser(doc: { _id: mongoose.Types.ObjectId | { toString(): string }; name?: string; email?: string; emailVerified?: Date; image?: string }): AdapterUser {
  return {
    id: typeof doc._id === 'object' && doc._id !== null && 'toString' in doc._id ? doc._id.toString() : String(doc._id),
    name: doc.name ?? null,
    email: doc.email ?? '',
    emailVerified: doc.emailVerified ?? null,
    image: doc.image ?? null,
  };
}

function toAdapterSession(doc: { sessionToken: string; userId: mongoose.Types.ObjectId | { toString(): string }; expires: Date }): AdapterSession {
  return {
    sessionToken: doc.sessionToken,
    userId: typeof doc.userId === 'object' && doc.userId !== null && 'toString' in doc.userId ? doc.userId.toString() : String(doc.userId),
    expires: doc.expires,
  };
}

export function MongooseAdapter(): Adapter {
  return {
    async createUser(user) {
      await getDb();
      const doc = await User.create({
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
      });
      return toAdapterUser(doc);
    },

    async getUser(id) {
      await getDb();
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await User.findById(id).lean() as { _id: mongoose.Types.ObjectId; name?: string; email?: string; emailVerified?: Date; image?: string } | null;
      if (!doc) return null;
      return toAdapterUser(doc);
    },

    async getUserByEmail(email) {
      await getDb();
      const doc = await User.findOne({ email }).lean() as { _id: mongoose.Types.ObjectId; name?: string; email?: string; emailVerified?: Date; image?: string } | null;
      if (!doc) return null;
      return toAdapterUser(doc);
    },

    async getUserByAccount({ provider, providerAccountId }) {
      await getDb();
      const account = await Account.findOne({ provider, providerAccountId })
        .populate('userId')
        .lean() as { userId: { _id: mongoose.Types.ObjectId; name?: string; email?: string; emailVerified?: Date; image?: string } } | null;
      if (!account?.userId) return null;
      return toAdapterUser(account.userId);
    },

    async updateUser(user) {
      await getDb();
      if (!mongoose.Types.ObjectId.isValid(user.id)) throw new Error('Invalid user id');
      const doc = await User.findByIdAndUpdate(
        user.id,
        {
          ...(user.name !== undefined && { name: user.name }),
          ...(user.email !== undefined && { email: user.email }),
          ...(user.emailVerified !== undefined && { emailVerified: user.emailVerified }),
          ...(user.image !== undefined && { image: user.image }),
        },
        { new: true }
      ).lean() as { _id: mongoose.Types.ObjectId; name?: string; email?: string; emailVerified?: Date; image?: string } | null;
      if (!doc) return null as unknown as AdapterUser;
      return toAdapterUser(doc);
    },

    async linkAccount(account) {
      await getDb();
      await Account.create({
        userId: new mongoose.Types.ObjectId(account.userId),
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
      });
    },

    async createSession(session) {
      await getDb();
      await Session.create({
        sessionToken: session.sessionToken,
        userId: new mongoose.Types.ObjectId(session.userId),
        expires: session.expires,
      });
      return session;
    },

    async getSessionAndUser(sessionToken) {
      await getDb();
      const sessionDoc = await Session.findOne({ sessionToken })
        .populate('userId')
        .lean() as { sessionToken: string; userId: { _id: mongoose.Types.ObjectId; name?: string; email?: string; emailVerified?: Date; image?: string }; expires: Date } | null;
      if (!sessionDoc) return null;
      return {
        session: toAdapterSession({
          sessionToken: sessionDoc.sessionToken,
          userId: sessionDoc.userId._id,
          expires: sessionDoc.expires,
        }),
        user: toAdapterUser(sessionDoc.userId),
      };
    },

    async updateSession(session) {
      await getDb();
      const doc = await Session.findOneAndUpdate(
        { sessionToken: session.sessionToken },
        {
          ...(session.expires !== undefined && { expires: session.expires }),
          ...(session.userId !== undefined && { userId: new mongoose.Types.ObjectId(session.userId) }),
        },
        { new: true }
      ).lean() as { sessionToken: string; userId: mongoose.Types.ObjectId; expires: Date } | null;
      if (!doc) return null as unknown as AdapterSession;
      return toAdapterSession(doc);
    },

    async deleteSession(sessionToken) {
      await getDb();
      const doc = await Session.findOneAndDelete({ sessionToken }).lean() as { sessionToken: string; userId: mongoose.Types.ObjectId; expires: Date } | null;
      if (!doc) return null as unknown as AdapterSession;
      return toAdapterSession(doc);
    },

    async createVerificationToken(token) {
      await getDb();
      await VerificationTokenModel.create(token);
      return token;
    },

    async useVerificationToken({ identifier, token }) {
      await getDb();
      const doc = await VerificationTokenModel.findOneAndDelete({ identifier, token }).lean() as { identifier: string; token: string; expires: Date } | null;
      if (!doc) return null;
      return { identifier: doc.identifier, token: doc.token, expires: doc.expires };
    },

    async getAccount(providerAccountId, provider) {
      await getDb();
      const doc = await Account.findOne({ provider, providerAccountId }).lean() as { _id: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId; provider: string; providerAccountId: string; type: string; refresh_token?: string; access_token?: string; expires_at?: number; token_type?: string; scope?: string; id_token?: string; session_state?: string } | null;
      if (!doc) return null;
      return {
        id: doc._id.toString(),
        userId: doc.userId.toString(),
        type: doc.type as AdapterAccount['type'],
        provider: doc.provider,
        providerAccountId: doc.providerAccountId,
        refresh_token: doc.refresh_token ?? undefined,
        access_token: doc.access_token ?? undefined,
        expires_at: doc.expires_at ?? undefined,
        token_type: doc.token_type ?? undefined,
        scope: doc.scope ?? undefined,
        id_token: doc.id_token ?? undefined,
        session_state: doc.session_state ?? undefined,
      } as AdapterAccount;
    },
  };
}
