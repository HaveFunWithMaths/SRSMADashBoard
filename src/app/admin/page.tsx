'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') return <div>Loading...</div>;
    if (!session) return null;

    return (
        <>
            <Header />
            <main className="container">
                <h2 className="text-xl font-bold mb-4">Admin Panel</h2>

                <div className="dashboard-grid">
                    <div className="card">
                        <h3 className="card-title">System Status</h3>
                        <div className="flex gap-4 items-center">
                            <div className="p-4 bg-green-100 rounded text-green-800">
                                <span className="block text-2xl font-bold">Online</span>
                                <span className="text-sm">System Operational</span>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title">Data Management</h3>
                        <p className="mb-4 text-sm text-muted">Data is synced automatically from the Excel source files on every request.</p>
                        <button
                            className="btn btn-secondary"
                            onClick={() => window.location.reload()}
                        >
                            Verify Data Sync
                        </button>
                    </div>
                </div>

                <div className="card mt-4">
                    <h3 className="card-title">User Management</h3>
                    <p className="text-sm text-muted">User accounts are managed via <code>LoginData.xlsx</code>. To add users, please update the Excel file.</p>
                </div>
            </main>
        </>
    );
}
