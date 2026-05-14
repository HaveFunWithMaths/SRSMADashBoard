'use client';

import { useState, useRef, ReactNode, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';

export default function FullScreenChart({ children, height = 350 }: { children: ReactNode, height?: number }) {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleFsChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                position: 'relative', 
                width: '100%', 
                height: isFullScreen ? '100vh' : height,
                backgroundColor: isFullScreen ? '#fff' : 'transparent',
                padding: isFullScreen ? '2rem' : '0',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <button
                onClick={toggleFullScreen}
                style={{
                    position: 'absolute',
                    bottom: isFullScreen ? '2rem' : '10px',
                    right: isFullScreen ? '2rem' : '10px',
                    zIndex: 10,
                    background: isFullScreen ? '#f1f5f9' : 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid #e2e8f0',
                    padding: '0.4rem',
                    borderRadius: '0.4rem',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
                {isFullScreen ? <Minimize size={20} /> : <Maximize size={18} />}
            </button>
            <div style={{ flex: 1, width: '100%', height: '100%', minHeight: isFullScreen ? '0' : height }}>
                {children}
            </div>
        </div>
    );
}
