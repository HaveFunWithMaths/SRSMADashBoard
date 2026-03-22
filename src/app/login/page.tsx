'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await signIn('credentials', {
                username,
                password,
                redirect: false,
            });

            if (res?.error) {
                setError('Invalid credentials');
                setIsLoading(false);
            } else {
                router.push('/dashboard');
                router.refresh();
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc' }}>
            {/* Left Panel - Branding */}
            <div style={{
                flex: '1',
                backgroundColor: '#1a365d',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '3rem',
                position: 'relative',
                overflow: 'hidden'
            }} className="hidden md:flex">
                {/* Decorative background elements */}
                <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(212, 148, 42, 0.1)', filter: 'blur(40px)' }} />
                <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(212, 148, 42, 0.15)', filter: 'blur(60px)' }} />

                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ width: 120, height: 120, margin: '0 auto 2rem', position: 'relative', borderRadius: '50%', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                        <img src="/SRSMALogo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', color: 'white', lineHeight: 1.2 }}>
                        Shri Ram Smart Minds Academy
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.6 }}>
                        Empowering minds, shaping futures. Access your academic dashboard below.
                    </p>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div style={{
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '2rem',
                position: 'relative'
            }}>
                <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
                    
                    {/* Mobile Logo (only shows on small screens) */}
                    <div className="md:hidden" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ width: 80, height: 80, margin: '0 auto 1rem', position: 'relative', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                            <img src="/SRSMALogo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', color: '#1a365d', fontSize: '1.5rem', fontWeight: 700 }}>SRSMA Portal</h2>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                            Welcome Back
                        </h2>
                        <p style={{ color: '#64748b' }}>Please enter your details to sign in.</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Username</label>
                            <input
                                type="text"
                                placeholder="Student or Teacher ID"
                                className="auth-input"
                                style={{ marginBottom: 0 }}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Password</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                className="auth-input"
                                style={{ marginBottom: 0 }}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #f87171', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 'bold' }}>!</span> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="btn" 
                            style={{ 
                                width: '100%', 
                                marginTop: '0.5rem', 
                                padding: '0.875rem',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>
            </div>
            {/* Global style for hiding on mobile using traditional class since we might not have tailwind fully configured */}
            <style jsx>{`
                @media (max-width: 768px) {
                    .md\\:hidden { display: block !important; }
                    .hidden.md\\:flex { display: none !important; }
                }
                @media (min-width: 769px) {
                    .md\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}
