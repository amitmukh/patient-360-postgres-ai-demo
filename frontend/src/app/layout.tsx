import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Patient 360 | PHI-safe Copilot powered by Azure Postgres AI',
  description: 'Clinical decision support with AI-powered insights and PHI-safe data handling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen">
          {/* Header */}
          <header className="header-gradient sticky top-0 z-50 shadow-lg">
            <div className="max-w-[1920px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Logo with pulse ring */}
                  <div className="relative">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></div>
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white tracking-tight">
                      Patient 360
                    </h1>
                    <p className="text-xs text-blue-100/80">
                      PHI-safe Copilot powered by Azure Postgres AI
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span className="text-sm font-medium text-white">Connected</span>
                  </div>
                  {/* Azure badge */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
                    <svg className="w-4 h-4 text-cyan-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.5 0L4 15.5 12.5 24l-1-8.5 4.5-1L12.5 0z"/>
                      <path d="M13.5 10L20 4.5 15.5 15l-4-1 2-4z" opacity="0.7"/>
                    </svg>
                    <span className="text-xs font-medium text-white/90">Demo Environment</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="max-w-[1920px] mx-auto px-4 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm mt-auto">
            <div className="max-w-[1920px] mx-auto px-6 py-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full border border-blue-100/50">
                    <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                    </svg>
                    <span className="font-medium text-gray-700">Azure Database for PostgreSQL</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-full border border-purple-100/50">
                    <svg className="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span className="font-medium text-gray-700">azure_ai + pgvector</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>All patient data is synthetic for demonstration purposes</span>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
