import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { createClient } from "@supabase/supabase-js"
import type { NextAuthOptions } from "next-auth"

// Estendi i tipi NextAuth
declare module "next-auth" {
  interface User {
    emailVerified?: Date | null
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      emailVerified?: Date | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    emailVerified?: Date | null
  }
}

// Client Supabase con service role per autenticazione
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Usa Supabase Auth per autenticare direttamente
          const { data, error } = await supabaseAdmin.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error || !data.user) {
            console.log('[Supabase] User not found:', credentials.email)
            return null
          }

          // Verifica che l'utente sia confermato
          if (!data.user.email_confirmed_at) {
            console.log('[Supabase] User email not confirmed:', credentials.email)
            return null
          }

          // Prendi i dati aggiuntivi da public.users
          const { data: userProfile } = await supabaseAdmin
            .from('users')
            .select('name, licenseNumber')
            .eq('id', data.user.id)
            .single()

          console.log('[Supabase] User authenticated successfully:', data.user.id)

          return {
            id: data.user.id,
            email: data.user.email!,
            name: userProfile?.name || data.user.user_metadata?.name || '',
            emailVerified: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at) : null,
          }
        } catch (error) {
          console.error('[Supabase] Authentication error:', error)
          return null
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.emailVerified = user.emailVerified
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.emailVerified = token.emailVerified
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
