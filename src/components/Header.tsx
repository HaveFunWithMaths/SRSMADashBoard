'use client';

import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, LayoutDashboard, Bell } from 'lucide-react';

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
        // Keep this if needed elsewhere, but no longer used on Bell click
    };

    const parseSubjectAndTopic = (message: string) => {
        const match1 = message.match(/uploaded for (.*?) - (.*?): /);
        if (match1) return { subject: match1[1].trim(), topic: match1[2].trim() };
        const match2 = message.match(/marks for (.*?) - (.*?) have been/);
        if (match2) return { subject: match2[1].trim(), topic: match2[2].trim() };
        return null;
    };

    const handleMarkAllAsRead = async () => {
        try {
            setNotifications([]);
            await fetch('/api/student/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
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
                            <div ref={notificationsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <button
                                    onClick={() => {
                                        setShowNotifications(!showNotifications);
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
                                        <div style={{ 
                                            padding: '0.75rem 1rem', 
                                            borderBottom: '1px solid #f1f5f9', 
                                            fontWeight: 600, 
                                            color: '#1e293b',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <span>Notifications</span>
                                            {notifications.length > 0 && (
                                                <button
                                                    onClick={handleMarkAllAsRead}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#7c3aed',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        padding: 0
                                                    }}
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>
                                        {notifications.length > 0 ? (
                                            notifications.map(n => (
                                                <div 
                                                    key={n.id} 
                                                    style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#475569', cursor: 'pointer' }}
                                                    onClick={async () => {
                                                        const parsed = parseSubjectAndTopic(n.message);
                                                        setNotifications(prev => prev.filter(x => x.id !== n.id));
                                                        fetch('/api/student/notifications', {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ id: n.id })
                                                        }).catch(err => console.error(err));
                                                        setShowNotifications(false);
                                                        if (parsed) {
                                                            router.push(`/dashboard?subject=${encodeURIComponent(parsed.subject)}&flashTopic=${encodeURIComponent(parsed.topic)}`);
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
                        {session.user?.role === 'admin' && pathname !== '/admin' && (
                            <Link href="/admin" 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.5rem 0.8rem', fontSize: '0.85rem', 
                                    textDecoration: 'none', backgroundColor: '#f1f5f9', 
                                    color: '#1e293b', borderRadius: '0.5rem', fontWeight: 500,
                                    transition: 'background-color 0.2s', marginRight: '0.5rem'
                                }}>
                                <LayoutDashboard size={16} />
                                <span className="hidden sm:inline">Admin Panel</span>
                            </Link>
                        )}
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
