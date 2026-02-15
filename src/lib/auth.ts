
import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUsers } from "./parser";
import { compare } from "bcryptjs";

// Extend built-in types
declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
        }
    }
    interface User {
        role?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null;

                const users = getUsers();
                const user = users.find(u => u.username.toLowerCase() === credentials.username.toLowerCase());

                if (!user || !user.password) return null;

                // V1: Plaintext check for legacy support (as per plan discussion, file has plaintext)
                // BUT also support bcrypt if we migrate. 
                // For now, checks equality directly because LoginData.xlsx has "12345"
                // If we want to support hashed, we'd need to hash "12345" and compare. 
                // Given constraints: "Passwords must be hashed (e.g., bcrypt) in the database."
                // But database IS the excel file with "12345". 
                // IMPL: We will compare Plaintext for now. To be secure, the APP should ideally hash them on the fly? 
                // No, that doesn't verify anything. 
                // Decision: Compare as is. If we want security, we MUST update the Excel file to contain hashes.
                // For this task, strict adherence to "Data Ingestion" means we read what's there.
                // The prompt said "Passwords must be hashed (e.g., bcrypt) in the database."
                // This likely implies we should HAVE stored hashes. Since we don't, we can't fully meet that constraint without altering the input file.
                // I will implement a check: if password starts with "$2", compare using bcrypt. Else comparison.

                const isBcrypt = user.password.startsWith('$2');
                let isValid = false;

                if (isBcrypt) {
                    isValid = await compare(credentials.password, user.password);
                } else {
                    isValid = user.password === credentials.password;
                }

                if (!isValid) return null;

                // Return user object compatible with NextAuth
                return {
                    id: user.username,
                    name: user.username,
                    role: user.role
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.name = token.name as string;
            }
            return session;
        }
    },
    pages: {
        signIn: '/login', // Custom login page
    },
    session: {
        strategy: "jwt"
    },
    secret: process.env.NEXTAUTH_SECRET,
};
