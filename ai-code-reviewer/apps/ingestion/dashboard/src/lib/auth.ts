import NextAuth, { type DefaultSession } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { mintApiToken } from './jwt';

declare module 'next-auth' {
  interface Session {
    apiToken: string;
    user: {
      login: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    apiToken?: string;
    githubLogin?: string;
    githubId?: string;
    apiTokenExp?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: 'jwt', maxAge: 86400 },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const p = profile as { id: number; login: string };
        token.githubId = String(p.id);
        token.githubLogin = p.login;
        token.apiToken = mintApiToken(String(p.id), p.login);
        token.apiTokenExp = Math.floor(Date.now() / 1000) + 86400;
      }
      // Re-mint if within 5 min of expiry
      if (token.apiTokenExp && token.apiTokenExp - Math.floor(Date.now() / 1000) < 300) {
        token.apiToken = mintApiToken(token.githubId!, token.githubLogin!);
        token.apiTokenExp = Math.floor(Date.now() / 1000) + 86400;
      }
      return token;
    },
    async session({ session, token }) {
      session.apiToken = token.apiToken ?? '';
      session.user.login = token.githubLogin ?? '';
      return session;
    },
  },
});
