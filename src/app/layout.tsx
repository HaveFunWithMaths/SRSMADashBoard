
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "SRSMA - Student Dashboard",
  description: "Shri Ram Smart Minds Academy Student Performance Dashboard",
};

export const viewport: Viewport = {
  width: 1200,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var width = 1200;
                var screenWidth = window.screen.width;
                if (screenWidth < width) {
                  var scale = screenWidth / width;
                  var viewport = document.querySelector('meta[name="viewport"]');
                  if (viewport) {
                    viewport.setAttribute('content', 'width=' + width + ', initial-scale=' + scale + ', minimum-scale=' + scale);
                  }
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
