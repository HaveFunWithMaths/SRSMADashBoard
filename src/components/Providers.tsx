'use client';

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        const updateViewport = () => {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                const width = 1200;
                const screenWidth = window.screen.width;
                if (screenWidth < width) {
                    const scale = screenWidth / width;
                    viewport.setAttribute('content', `width=${width}, initial-scale=${scale}, minimum-scale=${scale}`);
                } else {
                    viewport.setAttribute('content', 'width=device-width, initial-scale=1');
                }
            }
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        window.addEventListener('orientationchange', updateViewport);
        
        return () => {
            window.removeEventListener('resize', updateViewport);
            window.removeEventListener('orientationchange', updateViewport);
        };
    }, []);

    return (
        <SessionProvider>
            {children}
            <Toaster position="bottom-right" />
        </SessionProvider>
    );
}
