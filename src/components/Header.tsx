'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, LayoutDashboard } from 'lucide-react';

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();

    return (
        <header className="dashboard-header" style={{ borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
            <div className="container header-content">
                <div className="logo-section">
                    <div style={{ width: 44, height: 44, position: 'relative', borderRadius: '50%', overflow: 'hidden', border: '2px solid #f1f5f9' }}>
                        <img src="/SRSMALogo.jpeg" alt="SRSMA Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div className="logo-text">
                        <h1 style={{ fontSize: '1.15rem' }}>Shri Ram Smart Minds Academy</h1>
                    </div>
                </div>

                {session && (
                    <div className="user-nav">
                        <div className="user-info" style={{ marginRight: '0.5rem' }}>
                            <span className="user-name" style={{ fontSize: '0.9rem' }}>{session.user?.name}</span>
                            <span className="user-role" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{session.user?.role}</span>
                        </div>
                        
                        {(session.user?.role === 'teacher' || session.user?.role === 'admin') && pathname !== '/teacher' && (
                            <Link href="/teacher" 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 0.8rem', fontSize: '0.85rem', 
                                    textDecoration: 'none', backgroundColor: '#f1f5f9', 
                                    color: '#1e293b', borderRadius: '0.5rem', fontWeight: 500,
                                    transition: 'background-color 0.2s'
                                }}>
                                <LayoutDashboard size={16} />
                                <span className="hidden sm:inline">Teacher Board</span>
                            </Link>
                        )}
                        
                        <button 
                            onClick={() => signOut()} 
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                padding: '0.5rem 0.8rem', fontSize: '0.85rem', 
                                backgroundColor: 'transparent', border: '1px solid #e2e8f0',
                                color: '#64748b', borderRadius: '0.5rem', cursor: 'pointer',
                                fontWeight: 500, transition: 'all 0.2s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; }}
                            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                            <LogOut size={16} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </header >
    );
}
