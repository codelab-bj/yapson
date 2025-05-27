'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Check, CheckCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useTheme } from '../../components/ThemeProvider';
//import { markNotificationAsRead } from '../../utils/notifications';


interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface ExtendedWebSocket extends WebSocket {
  pingInterval?: NodeJS.Timeout;
}

/**
 * Client-side only function to mark a notification as read
 * This function can be exported and used anywhere in the application
 * @param notificationId - The ID of the notification to mark as read
 * @returns boolean indicating success
 */


export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const wsRef = useRef<ExtendedWebSocket | null>(null);
  const wsReconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  // const lastNotificationRef = useRef<HTMLDivElement | null>(null);

  const { t } = useTranslation();
  const router = useRouter();
  const { theme } = useTheme();

  // Store read notifications in client-side cache
  const markedAsReadCache = useRef<Set<string>>(new Set());

  // Load marked-as-read cache from localStorage on mount
  useEffect(() => {
    const cachedReadIds = localStorage.getItem('markedAsReadNotifications');
    if (cachedReadIds) {
      try {
        const readIdsArray = JSON.parse(cachedReadIds);
        markedAsReadCache.current = new Set(readIdsArray);
      } catch (err) {
        console.error('Failed to parse cached read notifications', err);
        localStorage.removeItem('markedAsReadNotifications');
      }
    }
  }, []);

  // Save marked-as-read cache to localStorage
  const updateReadCache = (id: string) => {
    markedAsReadCache.current.add(id);
    localStorage.setItem(
      'markedAsReadNotifications',
      JSON.stringify(Array.from(markedAsReadCache.current))
    );
  };

  const fetchNotifications = async (pageNum = 1) => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('No access token found');
      setError('Please log in to view notifications');
      return;
    }

    // Don't fetch if we've fetched within the last second (prevents duplicate fetches)
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 1000 && pageNum === 1) {
      return;
    }
    lastFetchTimeRef.current = now;

    try {
      setLoading(true);
      const res = await fetch(`https://api.yapson.net/yapson/notification?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data?.results?.length > 0) {
        // Apply local read status to the fetched notifications
        const cleaned = data.results.map((n: Notification) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          created_at: n.created_at,
          // Mark as read if it's in our local cache OR if API says it's read
          is_read: n.is_read || markedAsReadCache.current.has(n.id),
        }));

        // If it's page 1, replace notifications, otherwise append
        if (pageNum === 1) {
          setNotifications(cleaned);
        } else {
          setNotifications(prev => [...prev, ...cleaned]);
        }

        // Check if there are more pages available
        setHasMore(data.next !== null);
      } else {
        if (pageNum === 1) {
          setNotifications([]);
        }
        setHasMore(false);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Client-side only implementation for marking notifications as read
  const markAsRead = (id: string) => {
    try {
      // Update local state immediately
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );

      // Add to local cache
      updateReadCache(id);

      console.log(`Notification ${id} marked as read locally`);
      return true;
    } catch (err) {
      console.error('Failed to mark notification as read locally:', err);
      return false;
    }
  };

  // Client-side only implementation for marking all notifications as read
  const markAllAsRead = () => {
    try {
      // Update UI immediately
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

      // Add all to local cache
      notifications.forEach(notification => {
        updateReadCache(notification.id);
      });

      console.log('All notifications marked as read locally');
      return true;
    } catch (err) {
      console.error('Failed to mark all notifications as read locally:', err);
      return false;
    }
  };

  // Mark selected notifications as read
  const markSelectedAsRead = () => {
    try {
      setNotifications((prev) =>
        prev.map((n) => 
          selectedNotifications.has(n.id) ? { ...n, is_read: true } : n
        )
      );

      // Add selected to local cache
      selectedNotifications.forEach(id => {
        updateReadCache(id);
      });

      // Clear selection
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);

      console.log('Selected notifications marked as read locally');
      return true;
    } catch (err) {
      console.error('Failed to mark selected notifications as read locally:', err);
      return false;
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotifications(new Set());
  };

  // Toggle notification selection
  const toggleNotificationSelection = (id: string) => {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  };

  // Select all notifications
  const selectAllNotifications = () => {
    const allIds = new Set(notifications.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedNotifications(new Set());
  };

  // Load more notifications
  // const loadMore = () => {
  //   if (!loading && hasMore) {
  //     setPage(prev => prev + 1);
  //     fetchNotifications(page + 1);
  //   }
  // };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  // Setup WebSocket (same as in NotificationBell)
  const setupWebSocket = () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('No access token found for WebSocket connection');
      setError(t('You must be logged in to receive real-time updates.'));
      setWsStatus('error');
      return;
    }

    try {
      // Close existing connection if any
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
      }

      const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(accessToken)}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setWsStatus('connected');
        setError(null);
        wsReconnectAttempts.current = 0;

        wsRef.current!.pingInterval = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            return;
          }


          const newNotification: Notification = {
            id: data.id,
            title: data.title,
            content: data.content,
            created_at: data.created_at,
            is_read: data.is_read || markedAsReadCache.current.has(data.id),
          };

          setNotifications((prev) => [newNotification, ...prev]);
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
      };

      wsRef.current.onclose = () => {
        setWsStatus('disconnected');
        
        const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, wsReconnectAttempts.current));
        reconnectTimeoutRef.current = setTimeout(() => {
          wsReconnectAttempts.current++;
          setupWebSocket();
        }, reconnectDelay);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setWsStatus('error');
    }
  };

  
// Add this function before the return statement
const lastNotificationElement = (node: HTMLDivElement | null) => {
  if (loading) return;
  
  if (observerRef.current) observerRef.current.disconnect();
  
  observerRef.current = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting && hasMore) {
      setPage(prev => prev + 1);
      fetchNotifications(page + 1);
    }
  });
  
  if (node) observerRef.current.observe(node);
};




  // Initial fetch and WebSocket setup
  useEffect(() => {
    fetchNotifications(1);
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Add this line for observer cleanup
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className={`min-h-screen ${theme.colors.c_background}`}>
      {/* Header */}
      <div className={`${theme.colors.c_background} shadow-sm border-b border-gray-200 dark:border-gray-700`}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2">
                <Bell className="h-6 w-6" />
                <h1 className="text-2xl font-bold">Notifications</h1>
                {/* {unreadCount > 0 && (
                  <span className="bg-orange-500 text-white text-sm px-2 py-1 rounded-full">
                    {unreadCount}
                  </span>
                )} */}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-gray-500">
                {/* <div className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-500' : 
                  wsStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span>{wsStatus === 'connected' ? 'Live' : 'Offline'}</span> */}
              </div>

              <button
                onClick={() => fetchNotifications(1)}
                disabled={loading}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {notifications.length > 0 && (
        <div className={` bg-gradient-to-br ${theme.colors.a_background} border-b border-gray-200 dark:border-gray-700`}>
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleSelectionMode}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </button>

                {isSelectionMode && (
                  <>
                    <button
                      onClick={selectAllNotifications}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearAllSelections}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isSelectionMode && selectedNotifications.size > 0 && (
                  <button
                    onClick={markSelectedAsRead}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm hover:bg-blue-700"
                  >
                    <Check className="h-3 w-3" />
                    <span>Mark Read ({selectedNotifications.size})</span>
                  </button>
                )}

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-full text-sm hover:bg-green-700"
                  >
                    <CheckCheck className="h-3 w-3" />
                    <span>Mark All Read</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading && notifications.length === 0 ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12  mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No notifications yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {("When you receive notifications, they'll appear here.")}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification, index) => (
            <div
                key={notification.id}
                ref={index === notifications.length - 1 ? lastNotificationElement : null}
                className={`relative bg-gradient-to-br ${theme.colors.a_background} rounded-lg border ${
                  notification.is_read 
                    ? 'border-gray-200 dark:border-gray-700' 
                    : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10'
                } p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  selectedNotifications.has(notification.id) ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleNotificationSelection(notification.id);
                  } else if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  {isSelectionMode && (
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={selectedNotifications.has(notification.id)}
                        onChange={() => toggleNotificationSelection(notification.id)}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-medium ${
                        notification.is_read 
                          ? `${theme.colors.text}`
                          : `${theme.colors.text} font-semibold`
                      }`}>
                        {notification.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(notification.created_at)}
                        </span>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        )}
                      </div>
                    </div>
                    <p className={`mt-1 text-sm ${
                      notification.is_read 
                        ? `${theme.colors.text}`
                        : `${theme.colors.text}`
                    }`}>
                      {notification.content}
                    </p>
                  </div>
                </div>

                {!isSelectionMode && !notification.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(notification.id);
                    }}
                    className="absolute top-4 right-4 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Check className="h-4 w-4 text-gray-400 hover:text-green-600" />
                  </button>
                )}
              </div>
            ))}

            {/* Load More Button */}
            {/* {hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className={`px-6 py-2 bg-gradient-to-br ${theme.colors.a_background} text-white rounded-full hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )} */}
            {loading && hasMore && (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}