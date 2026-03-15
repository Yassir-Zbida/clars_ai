import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import { MongooseAdapter } from '@/lib/auth-mongoose-adapter';
import { getDb } from '@/server/db';
import { User } from '@/server/models/user';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongooseAdapter(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/login',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(process.env.RESEND_API_KEY
      ? [
          Resend({
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.EMAIL_FROM ?? 'noreply@clars.ai',
          }),
        ]
      : []),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await getDb();
        const user = await User.findOne({
          email: String(credentials.email),
          deletedAt: { $in: [null, undefined] },
        })
          .select('+password')
          .lean();
        const doc = user as { _id: { toString(): string }; email?: string; name?: string; image?: string; password?: string } | null;
        if (!doc?.password) return null;
        const ok = await bcrypt.compare(String(credentials.password), doc.password);
        if (!ok) return null;
        return {
          id: String(doc._id),
          email: doc.email ?? undefined,
          name: doc.name ?? undefined,
          image: doc.image ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
});
