'use client';

import { useEffect } from 'react';

interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

export default function ChunkErrorBoundary({ children }: ChunkErrorBoundaryProps) {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (event.message.includes('ChunkLoadError') || event.message.includes('Loading chunk')) {
        console.error('Chunk loading error detected:', event);
        
        // Show user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          text-align: center;
        `;
        errorMessage.innerHTML = `
          <h2>Application Update Required</h2>
          <p>Please refresh the page to load the latest version.</p>
          <button onclick="window.location.reload()" style="
            background: #f97316;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
          ">Refresh Page</button>
        `;
        document.body.appendChild(errorMessage);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('ChunkLoadError') || 
           event.reason.message.includes('Loading chunk'))) {
        console.error('Chunk loading promise rejection:', event.reason);
        handleChunkError(new ErrorEvent('error', { message: event.reason.message }));
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return <>{children}</>;
} 