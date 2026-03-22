'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
                setError('Invalid username or password.');
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
        <>
            <style>{`
                .login-page {
                    min-height: 100vh;
                    min-height: 100dvh;
                    background-color: #f0f2f5;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                    font-family: 'Inter', sans-serif;
                }

                /* ── Branding Block ── */
                .login-brand {
                    text-align: center;
                    margin-bottom: 1.5rem;
                }

                .login-brand-logo {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    object-fit: cover;
                    border: 3px solid #fff;
                    box-shadow: 0 4px 16px rgba(26, 54, 93, 0.18);
                    margin-bottom: 0.85rem;
                }

                .login-brand-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 1.6rem;
                    font-weight: 700;
                    color: #1a365d;
                    line-height: 1.25;
                    margin: 0 0 0.25rem;
                }

                .login-brand-tagline {
                    font-size: 0.875rem;
                    color: #64748b;
                    margin: 0;
                }

                /* ── Card ── */
                .login-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 1.75rem 1.5rem;
                    width: 100%;
                    max-width: 396px;
                    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.09);
                }

                /* ── Form Fields ── */
                .login-field {
                    margin-bottom: 0.85rem;
                }

                .login-input {
                    width: 100%;
                    padding: 0.85rem 1rem;
                    border: 1.5px solid #dde1e7;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-family: 'Inter', sans-serif;
                    color: #1e293b;
                    background: #f8fafc;
                    transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
                    outline: none;
                    -webkit-appearance: none;
                }

                .login-input::placeholder {
                    color: #94a3b8;
                }

                .login-input:focus {
                    border-color: #1877f2;
                    background: #fff;
                    box-shadow: 0 0 0 3px rgba(24, 119, 242, 0.12);
                }

                /* ── Error ── */
                .login-error {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.7rem 0.9rem;
                    background: #fff1f2;
                    border: 1px solid #fda4af;
                    border-radius: 8px;
                    color: #be123c;
                    font-size: 0.875rem;
                    margin-bottom: 0.85rem;
                    animation: shake 0.35s ease;
                }

                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25%       { transform: translateX(-6px); }
                    75%       { transform: translateX(6px); }
                }

                /* ── Submit Button ── */
                .login-btn {
                    width: 100%;
                    padding: 0.875rem;
                    background: #1877f2;
                    color: #fff;
                    border: none;
                    border-radius: 10px;
                    font-size: 1.05rem;
                    font-weight: 700;
                    font-family: 'Outfit', sans-serif;
                    cursor: pointer;
                    transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
                    letter-spacing: 0.01em;
                    box-shadow: 0 2px 8px rgba(24, 119, 242, 0.25);
                    margin-top: 0.25rem;
                }

                .login-btn:hover:not(:disabled) {
                    background: #166fe5;
                    box-shadow: 0 4px 14px rgba(24, 119, 242, 0.35);
                    transform: translateY(-1px);
                }

                .login-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(24, 119, 242, 0.2);
                }

                .login-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                /* Loading spinner inside button */
                .login-btn-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }

                .login-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2.5px solid rgba(255,255,255,0.4);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: spin 0.7s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                /* ── Divider ── */
                .login-divider {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 1.25rem 0;
                    color: #94a3b8;
                    font-size: 0.8rem;
                    font-weight: 500;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .login-divider::before,
                .login-divider::after {
                    content: '';
                    flex: 1;
                    height: 1px;
                    background: #e2e8f0;
                }

                /* ── Footer note ── */
                .login-footer {
                    text-align: center;
                    margin-top: 1.25rem;
                    font-size: 0.8rem;
                    color: #94a3b8;
                }

                /* ── Desktop enhancement ── */
                @media (min-width: 768px) {
                    .login-page {
                        background: linear-gradient(135deg, #f0f2f5 0%, #dde6f0 100%);
                    }

                    .login-brand-logo {
                        width: 96px;
                        height: 96px;
                    }

                    .login-brand-title {
                        font-size: 1.9rem;
                    }

                    .login-card {
                        padding: 2.25rem 2rem;
                        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
                    }
                }

                /* ── Safe area for phones with notch/home bar ── */
                @supports (padding: env(safe-area-inset-bottom)) {
                    .login-page {
                        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
                        padding-left:   calc(1rem + env(safe-area-inset-left));
                        padding-right:  calc(1rem + env(safe-area-inset-right));
                    }
                }
            `}</style>

            <div className="login-page">
                {/* Branding */}
                <div className="login-brand">
                    <img
                        src="/SRSMALogo.jpeg"
                        alt="SRSMA Logo"
                        className="login-brand-logo"
                    />
                    <h1 className="login-brand-title">SRSMA Portal</h1>
                    <p className="login-brand-tagline">Shri Ram Smart Minds Academy</p>
                </div>

                {/* Login card */}
                <div className="login-card">
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Username */}
                        <div className="login-field">
                            <input
                                id="login-username"
                                type="text"
                                className="login-input"
                                placeholder="Username or Student ID"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                                autoCapitalize="none"
                                autoCorrect="off"
                                spellCheck={false}
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="login-field">
                            <input
                                id="login-password"
                                type="password"
                                className="login-input"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="login-error" role="alert">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            id="login-submit"
                            type="submit"
                            className="login-btn"
                            disabled={isLoading}
                        >
                            <span className="login-btn-inner">
                                {isLoading && <span className="login-spinner" aria-hidden="true" />}
                                {isLoading ? 'Signing in…' : 'Log In'}
                            </span>
                        </button>
                    </form>

                    <div className="login-divider">or</div>

                    <div className="login-footer">
                        Contact your teacher or administrator<br />if you&apos;ve forgotten your credentials.
                    </div>
                </div>

                {/* Bottom page note */}
                <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                    © {new Date().getFullYear()} Shri Ram Smart Minds Academy
                </p>
            </div>
        </>
    );
}
