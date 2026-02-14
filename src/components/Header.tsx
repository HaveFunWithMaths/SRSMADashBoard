'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';

export default function Header() {
    const { data: session } = useSession();

    return (
        <header className="dashboard-header">
            <div className="container header-content">
                <div className="logo-section">
                    {/* Logo - assuming it's in public/branding, copying it there later */}
                    <div style={{ width: 50, height: 50, position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                        <img src="/SRSMALogo.jpeg" alt="SRSMA Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="logo-text">
                        <h1>Shri Ram Smart Minds Academy</h1>
                    </div>
                </div>

                {session && (
                    <div className="user-nav">
                        <div className="user-info">
                            <span className="user-name">{session.user?.name}</span>
                            <span className="user-role">{session.user?.role}</span>
                        </div>
                        {(session.user?.role === 'teacher' || session.user?.role === 'admin') && (
                            <Link href="/teacher" className="btn btn-secondary" style={{ marginRight: '1rem', padding: '0.5rem 1rem', fontSize: '0.9rem', textDecoration: 'none' }}>
                                Teacher Dashboard
                            </Link>
                        )}
                        <button onClick={() => signOut()} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            Logout
                        </button>
                    </div>
                )}
            </div>
        </header >
    );
}
