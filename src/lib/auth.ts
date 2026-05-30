
import NextAuth, { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUsersFromDB } from "./parser";
import { compare } from "bcryptjs";

// Extend built-in types
declare module "next-auth" {
    interface Session {
        user: {
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
            username?: string | null; // roll number / login ID
            class?: string | null;
        }
    }
    interface User {
        role?: string;
        username?: string | null; // roll number / login ID
        class?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        username?: string | null; // roll number / login ID
        class?: string | null;
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

                try {
                    const users = await getUsersFromDB();

                    // Search by roll number (username field) only.
                    const credLower = credentials.username.toLowerCase().trim();
                    const user = users.find((u) =>
                        (u.username || '').toLowerCase().trim() === credLower
                    );

                    if (!user || !user.password) return null;

                    // Support both bcrypt hashes and plaintext passwords.
                    const isBcrypt = user.password.startsWith('$2');
                    let isValid = false;

                    if (isBcrypt) {
                        isValid = await compare(credentials.password, user.password);
                    } else {
                        isValid = user.password === credentials.password;
                    }

                    if (!isValid) return null;

                    // Always return the actual student name as `name` so that
                    // data lookups (which match student_name in performance_marks) work correctly.
                    return {
                        id: user.username || user.name,
                        name: user.name,       // real display name (e.g. "Ravi Kumar")
                        username: user.username, // roll number / login ID (e.g. "2601")
                        role: user.role,
                        class: user.class || null
                    };
                } catch (err) {
                    console.error("Auth authorize failed due to DB error:", err);
                    throw new Error("Unable to connect to the database. Please try again later.");
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.name = user.name;       // real name (e.g. "Ravi Kumar")
                token.username = user.username; // roll number (e.g. "2601")
                token.class = user.class;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.name = token.name as string;         // real name
                session.user.username = token.username as string; // roll number
                session.user.class = token.class as string | null;
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
