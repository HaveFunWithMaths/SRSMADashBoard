'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const res = await signIn('credentials', {
            username,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Invalid credentials');
        } else {
            router.push('/dashboard');
            router.refresh();
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="mb-4">
                    <div style={{ width: 80, height: 80, margin: '0 auto', position: 'relative', borderRadius: '50%', overflow: 'hidden' }}>
                        <img src="/SRSMALogo.jpeg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h2 className="mt-4" style={{ color: '#1a365d' }}>SRSMA Login</h2>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Shri Ram Smart Minds Academy</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Username (Student Name)"
                        className="auth-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}

                    <button type="submit" className="btn" style={{ width: '100%' }}>
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
