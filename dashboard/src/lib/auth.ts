import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    // Simple credentials provider for MVP
    // In production, replace with proper auth (Google, Email magic link, etc.)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        // For MVP: Accept any email and check payment status separately
        // In production: Validate against database
        if (credentials?.email) {
          return {
            id: credentials.email,
            email: credentials.email,
            hasPaid: false, // Default to false, updated after Stripe payment
          };
        }
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          hasPaid: token.hasPaid || false,
        },
      };
    },
    async jwt({ token, user }) {
      if (user) {
        token.hasPaid = (user as any).hasPaid || false;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

