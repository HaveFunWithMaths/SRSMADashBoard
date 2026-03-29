'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Bell } from 'lucide-react';

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (session?.user?.role === 'student') {
            fetch('/api/student/notifications')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setNotifications(data);
                })
                .catch(err => console.error(err));
        }
    }, [session]);

    const handleNotificationsViewed = async () => {
        if (notifications.length > 0) {
            await fetch('/api/student/notifications', { method: 'PATCH' });
            // Keep them in state but mark length conceptually or just empty them
            // Emptying them implies they disappear from dropdown which might be annoying if they wanted to read them.
            // But we will fetch again on refresh and they will be gone.
        }
    };

    const parseSubjectFromMessage = (message: string) => {
        const match1 = message.match(/uploaded for (.*?) - /);
        if (match1) return match1[1];
        const match2 = message.match(/marks for (.*?) - /);
        if (match2) return match2[1];
        return null;
    };

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
                        {session.user?.role === 'student' && (
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => {
                                        setShowNotifications(!showNotifications);
                                        if (!showNotifications) handleNotificationsViewed();
                                    }}
                                    style={{
                                        background: 'transparent', border: 'none', cursor: 'pointer',
                                        position: 'relative', marginRight: '1rem', color: '#64748b'
                                    }}
                                >
                                    <Bell size={20} />
                                    {notifications.length > 0 && (
                                        <span style={{
                                            position: 'absolute', top: -4, right: -4,
                                            background: '#ef4444', color: '#fff', fontSize: '0.65rem',
                                            fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '1rem',
                                            minWidth: '16px', textAlign: 'center'
                                        }}>
                                            {notifications.length}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: '1rem', marginTop: '0.5rem',
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', width: '300px', zIndex: 100,
                                        maxHeight: '400px', overflowY: 'auto'
                                    }}>
                                        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b' }}>
                                            Notifications
                                        </div>
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}
                                                    onClick={() => {
                                                        const subj = parseSubjectFromMessage(n.message);
                                                        setShowNotifications(false);
                                                        if (subj && pathname === '/dashboard') {
                                                            router.push(`/dashboard?subject=${encodeURIComponent(subj)}`);
                                                        } else if (subj) {
                                                            router.push(`/dashboard?subject=${encodeURIComponent(subj)}`);
                                                        }
                                                    }}
                                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    {n.message}
                                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                        {new Date(n.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                                No new notifications
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
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
