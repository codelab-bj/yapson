"use client"
import { useState, useEffect } from 'react';
import { useTheme } from '../../components/ThemeProvider';

interface Coupon {
  app: string;
  code: string;
  date: string;
}

const CouponPage = () => {
  const [mounted, setMounted] = useState(false);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
    if (!mounted) return;
    const fetchCoupon = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          setError('No access token found.');
          setLoading(false);
          return;
        }
        const response = await fetch('https://api.yapson.net/yapson/coupon', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch coupon.');
        }
        const data = await response.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          // Map API fields to our UI fields. Adjust as needed.
          const c = data.results[0];
          setCoupon({
            app: (c.bet_app && (c.bet_app.public_name || c.bet_app.name)) || '',
            code: c.code || c.coupon_code || c.id,
            date: c.date || c.created_at || '',
          });
        } else {
          setCoupon(null);
        }
      } catch (err: unknown) {
        let message = 'An error occurred.';
        if (err instanceof Error) {
          message = err.message;
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchCoupon();
  }, [mounted]);

  const handleCopy = () => {
    if (coupon) {
      navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  // Fallbacks for theme
  const textColor = theme.colors.text ;
  const borderRadius = theme?.values?.borderRadius || '1rem';

  if (!mounted) return null;

  return (
    <div className={`min-h-screen pb-8 bg-gradient-to-br ${theme.colors.c_background}`}>
      {/* Header */}
      <div className={`flex items-center px-4 pt-6 pb-4 shadow-sm bg-gradient-to-br ${theme.colors.a_background}`} style={{ borderBottomLeftRadius: borderRadius, borderBottomRightRadius: borderRadius }}>
        <button
          onClick={() => window.history.back()}
          className="mr-2 p-2 rounded-full "
          aria-label="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-2xl font-bold tracking-wide" style={{ color: textColor }}>Vos Coupons</h1>
        <div className="w-8" /> {/* Spacer for symmetry */}
      </div>

      {/* Main Content */}
      <div className="flex justify-center mt-8">
        <div className="w-[90vw] max-w-md">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-400"></div>
            </div>
          ) : error ? (
            <div className={`rounded-2xl shadow p-6 text-center bg-gradient-to-br ${theme.colors.background}`} style={{ borderRadius }}>
              <div className="text-red-600 font-semibold mb-2">{error}</div>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-medium"
              >
                Try Again
              </button>
            </div>
          ) : !coupon ? (
            <div className={`rounded-2xl shadow p-6 text-center bg-gradient-to-br ${theme.colors.background}`} style={{ borderRadius }}>
              <div className="text-gray-700 font-semibold">No coupon available.</div>
            </div>
          ) : (
            <div className={`rounded-2xl shadow p-6 bg-gradient-to-br ${theme.colors.background}`} style={{ borderRadius }}>
              <div className="flex flex-col gap-4">
                {/* App Row */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base" style={{ color: textColor }}>App</span>
                  <span className="text-base" style={{ color: textColor }}>{coupon.app}</span>
                </div>
                {/* Code Row */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base" style={{ color: textColor }}>Code</span>
                  <span className="flex items-center gap-2">
                    <span className="text-base tracking-widest" style={{ color: textColor }}>{coupon.code}</span>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded hover:bg-gray-200"
                      aria-label="Copy code"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <rect x="3" y="3" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                    {copied && <span className="text-xs text-green-600 ml-1">Copied!</span>}
                  </span>
                </div>
                {/* Date Row */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-base" style={{ color: textColor }}>Date</span>
                  <span className="text-base" style={{ color: textColor }}>{coupon.date ? coupon.date.slice(0, 10) : ''}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CouponPage;