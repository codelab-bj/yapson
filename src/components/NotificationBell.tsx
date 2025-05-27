
// 'use client';

// import { useEffect, useState, useRef } from 'react';
// import { Bell } from 'lucide-react';
// import { useTranslation } from 'react-i18next';

// interface Notification {
//   id: string;
//   title: string;
//   content: string;
//   created_at: string;
//   is_read: boolean;
// }

// interface NotificationBellProps {
//   className?: string;
// }

// interface ExtendedWebSocket extends WebSocket {
//   pingInterval?: NodeJS.Timeout;
// }

// /**
//  * Client-side only function to mark a notification as read
//  * This function can be exported and used anywhere in the application
//  * @param notificationId - The ID of the notification to mark as read
//  * @returns boolean indicating success
//  */
// export const markNotificationAsRead = (notificationId: string): boolean => {
//   try {
//     // Get current marked read notifications from localStorage
//     const cachedReadIds = localStorage.getItem('markedAsReadNotifications');
//     let readIdsSet: Set<string> = new Set();
    
//     if (cachedReadIds) {
//       try {
//         const readIdsArray = JSON.parse(cachedReadIds);
//         readIdsSet = new Set(readIdsArray);
//       } catch (err) {
//         console.error('Failed to parse cached read notifications', err);
//         // Reset if corrupted
//         localStorage.removeItem('markedAsReadNotifications');
//         readIdsSet = new Set();
//       }
//     }
    
//     // Add this notification ID to the set
//     readIdsSet.add(notificationId);
    
//     // Save back to localStorage
//     localStorage.setItem(
//       'markedAsReadNotifications', 
//       JSON.stringify(Array.from(readIdsSet))
//     );
    
//     return true;
//   } catch (err) {
//     console.error(`Failed to mark notification ${notificationId} as read:`, err);
//     return false;
//   }
// };

// export default function NotificationBell({ className }: NotificationBellProps) {
//   const [open, setOpen] = useState(false);
//   const [notifications, setNotifications] = useState<Notification[]>([]);
//   const [error, setError] = useState<string | null>('');
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(true);
//   const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const wsRef = useRef<ExtendedWebSocket | null>(null);
//   const wsReconnectAttempts = useRef(0);
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
//   const lastFetchTimeRef = useRef<number>(0);
//   const { t } = useTranslation();

//   // Store read notifications in client-side cache
//   const markedAsReadCache = useRef<Set<string>>(new Set());
  
//   // Load marked-as-read cache from localStorage on mount
//   useEffect(() => {
//     const cachedReadIds = localStorage.getItem('markedAsReadNotifications');
//     if (cachedReadIds) {
//       try {
//         const readIdsArray = JSON.parse(cachedReadIds);
//         markedAsReadCache.current = new Set(readIdsArray);
//       } catch (err) {
//         console.error('Failed to parse cached read notifications', err);
//         localStorage.removeItem('markedAsReadNotifications');
//       }
//     }
//   }, []);

//   // Save marked-as-read cache to localStorage
//   const updateReadCache = (id: string) => {
//     markedAsReadCache.current.add(id);
//     localStorage.setItem(
//       'markedAsReadNotifications', 
//       JSON.stringify(Array.from(markedAsReadCache.current))
//     );
//   };
  
//   const fetchNotifications = async (pageNum = 1) => {
//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) {
//       console.error('No access token found');
//       return;
//     }
  
//     // Don't fetch if we've fetched within the last second (prevents duplicate fetches)
//     const now = Date.now();
//     if (now - lastFetchTimeRef.current < 1000 && pageNum === 1) {
//       return;
//     }
//     lastFetchTimeRef.current = now;
  
//     try {
//       setLoading(true);
//       const res = await fetch(`https://api.yapson.net/yapson/notification?page=${pageNum}`, {
//         headers: { Authorization: `Bearer ${accessToken}` },
//       });
  
//       if (!res.ok) throw new Error(`HTTP ${res.status}`);
  
//       const data = await res.json();
  
//       if (data?.results?.length > 0) {
//         // Apply local read status to the fetched notifications
//         const cleaned = data.results.map((n: Notification) => ({
//           id: n.id,
//           title: n.title,
//           content: n.content,
//           created_at: n.created_at,
//           // Mark as read if it's in our local cache OR if API says it's read
//           is_read: n.is_read || markedAsReadCache.current.has(n.id),
//         }));
        
//         // If it's page 1, replace notifications, otherwise append
//         if (pageNum === 1) {
//           setNotifications(cleaned);
//         } else {
//           setNotifications(prev => [...prev, ...cleaned]);
//         }
        
//         // Check if there are more pages available
//         setHasMore(data.next !== null);
//       } else {
//         if (pageNum === 1) {
//           setNotifications([]);
//         }
//         setHasMore(false);
//       }
//       setError(null);
//     } catch (err) {
//       console.error('Failed to load notifications:', err);
//       setError('Failed to load notifications');
//       setHasMore(false);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Client-side only implementation for marking notifications as read
//   const markAsRead = (id: string) => {
//     try {
//       // Update local state immediately
//       setNotifications((prev) =>
//         prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
//       );
      
//       // Add to local cache
//       updateReadCache(id);
      
//       // No API call - we're handling this client-side only
//       console.log(`Notification ${id} marked as read locally`);
//       return true;
//     } catch (err) {
//       console.error('Failed to mark notification as read locally:', err);
//       return false;
//     }
//   };

//   // Client-side only implementation for marking all notifications as read
//   const markAllAsRead = () => {
//     try {
//       // Update UI immediately
//       setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      
//       // Add all to local cache
//       notifications.forEach(notification => {
//         updateReadCache(notification.id);
//       });
      
//       console.log('All notifications marked as read locally');
//       return true;
//     } catch (err) {
//       console.error('Failed to mark all notifications as read locally:', err);
//       return false;
//     }
//   };

//   const setupWebSocket = () => {
//     const accessToken = localStorage.getItem('accessToken');
//     if (!accessToken) {
//       console.error('No access token found for WebSocket connection');
//       setError(t('You must be logged in to receive real-time updates.'));
//       setWsStatus('error');
//       return;
//     }

//     // Validate token format to avoid obvious connection errors
//     if (!accessToken.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
//       console.error('Invalid token format');
//       setError(t('Authentication error. Please try logging in again.'));
//       setWsStatus('error');
//       return;
//     }

//     try {
//       // Close existing connection if any
//       if (wsRef.current) {
//         if (wsRef.current.pingInterval) {
//           clearInterval(wsRef.current.pingInterval);
//         }
//         wsRef.current.close();
//       }

//       // Set a connection timeout
//       const connectionTimeoutId = setTimeout(() => {
//         console.error('WebSocket connection timeout');
//         if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
//           wsRef.current.close();
//           setWsStatus('disconnected');
//           console.log(t('Connection timeout. Attempting to reconnect...'));
//         }
//       }, 10000); // 10 seconds timeout

//       // Create new WebSocket connection
//       const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(accessToken)}`;
//       console.log('Connecting to WebSocket:', wsUrl);
//       wsRef.current = new WebSocket(wsUrl);

//       wsRef.current.onopen = () => {
//         console.log('WebSocket connected successfully');
//         clearTimeout(connectionTimeoutId);
//         setWsStatus('connected');
//         setError(null);
//         wsReconnectAttempts.current = 0;
        
//         // Set a ping interval to keep connection alive
//         wsRef.current!.pingInterval = setInterval(() => {
//           if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
//             wsRef.current.send(JSON.stringify({ type: 'ping' }));
//           }
//         }, 30000); // Send ping every 30 seconds
//       };

//       wsRef.current.onmessage = (event) => {
//         console.log('WebSocket message received:', event.data);
//         try {
//           const data = JSON.parse(event.data);
          
//           if (data.type === 'pong') {
//             console.log('WebSocket connection is alive');
//             return;
//           }
          
//           // Handle notification message
//           const newNotification: Notification = {
//             id: data.id,
//             title: data.title,
//             content: data.content,
//             created_at: data.created_at,
//             is_read: data.is_read || markedAsReadCache.current.has(data.id),
//           };
          
//           setNotifications((prev) => [newNotification, ...prev]);
//         } catch (error) {
//           console.error('Error processing WebSocket message:', error);
//         }
//       };

//       wsRef.current.onerror = (error) => {
//         console.error('WebSocket error:', error);
//         clearTimeout(connectionTimeoutId);
        
//         // Attempt to get more error details
//         let errorMessage = t('Connection error. Please check your network.');
//         if (error instanceof ErrorEvent && error.message) {
//           errorMessage = `WebSocket error: ${error.message}`;
//         }
        
//         setError(errorMessage);
//         setWsStatus('error');
//       };

//       wsRef.current.onclose = (event) => {
//         console.log('WebSocket connection closed', event);
//         clearTimeout(connectionTimeoutId);
        
//         // Clear ping interval if exists
//         if (wsRef.current && wsRef.current.pingInterval) {
//           clearInterval(wsRef.current.pingInterval);
//         }
        
//         setWsStatus('disconnected');
        
//         // Provide more context about the closure
//         let reason = 'Connection closed';
//         if (event.code) {
//           switch (event.code) {
//             case 1000:
//               reason = 'Normal closure';
//               break;
//             case 1001:
//               reason = 'Server going down or browser navigating away';
//               break;
//             case 1002:
//               reason = 'Protocol error';
//               break;
//             case 1003:
//               reason = 'Unsupported data';
//               break;
//             case 1006:
//               reason = 'Abnormal closure, possibly network issue';
//               break;
//             case 1008:
//               reason = 'Policy violation';
//               break;
//             case 1011:
//               reason = 'Server error';
//               break;
//             case 1012:
//               reason = 'Service restart';
//               break;
//             case 1013:
//               reason = 'Service unavailable temporarily';
//               break;
//             default:
//               reason = `Close code ${event.code}`;
//           }
//         }
        
//         console.log('WebSocket close reason:', reason);
        
//         // Attempt to reconnect after delay
//         const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, wsReconnectAttempts.current));
//         console.log(`Reconnecting in ${reconnectDelay / 1000} seconds...`);
        
//         reconnectTimeoutRef.current = setTimeout(() => {
//           wsReconnectAttempts.current++;
//           setupWebSocket();
//         }, reconnectDelay);
//       };
//     } catch (error) {
//       console.error('Failed to setup WebSocket:', error);
//       setWsStatus('error');
//       setError(t('Failed to establish real-time connection. Please try again.'));
//     }
//   };

//   // Initial fetch
//   useEffect(() => {
//     fetchNotifications(1);
    
//     // Setup WebSocket connection
//     setupWebSocket();
    
//     // Add event listener for page refresh/visibility change
//     const handleVisibilityChange = () => {
//       if (document.visibilityState === 'visible') {
//         // Fetch fresh data when page becomes visible again
//         fetchNotifications(1);
//       }
//     };
    
//     document.addEventListener('visibilitychange', handleVisibilityChange);
    
//     // Cleanup function
//     return () => {
//       if (wsRef.current) {
//         if (wsRef.current.pingInterval) {
//           clearInterval(wsRef.current.pingInterval);
//         }
//         wsRef.current.close();
//         wsRef.current = null;
//       }
      
//       // Clean up event listener
//       document.removeEventListener('visibilitychange', handleVisibilityChange);
      
//       // Clear any pending reconnection timeouts
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//     };
//   }, []);

//   // Fallback to polling every 60 seconds as a backup
//   useEffect(() => {
//     const interval = setInterval(() => {
//       if (wsStatus !== 'connected') {
//         fetchNotifications(1); // Always fetch first page for polling updates
//       }
//     }, 60000);
    
//     return () => clearInterval(interval);
//   }, [wsStatus]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', handleClickOutside);
//     return () => document.removeEventListener('mousedown', handleClickOutside);
//   }, []);

//   return (
//     <div className={`relative ${className ?? ''}`} ref={dropdownRef}>
//       <button
//         onClick={() => setOpen(!open)}
//         className="relative p-1 rounded-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
//       >
//         <Bell className="h-6 w-6" />
//         {notifications.some((n) => !n.is_read) && (
//           <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">
//             {notifications.filter((n) => !n.is_read).length}
//           </span>
//         )}
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-white dark:bg-gray-900 text-orange-700 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50">
//           <div className="p-4">
//             <div className="flex justify-between items-center mb-2">
//               <h2 className="text-lg font-semibold">{t('Notifications')}</h2>
//               <button
//                 onClick={markAllAsRead}
//                 className="text-xs text-blue-600 hover:underline"
//               >
//                 {t('Mark all as read')}
//               </button>
//             </div>

//             {error && <p className="text-orange-500 text-sm">{error}</p>}
            
//             {wsStatus === 'connected' && (
//               <p className="text-xs text-green-500 mb-2">
//                 {/* {t('Real-time updates active')} */}
//               </p>
//             )}
            
//             {wsStatus === 'error' && (
//               <p className="text-xs text-yellow-500 mb-2">
//                 {/* {t('Using periodic updates (real-time unavailable)')} */}
//               </p>
//             )}

//             {notifications.length === 0 && !loading && (
//               <p className="text-gray-500 text-sm">{t('No notifications')}</p>
//             )}

//             <ul className="space-y-3">
//               {notifications.map((notif) => (
//                 <li
//                   key={notif.id}
//                   onClick={() => markAsRead(notif.id)}
//                   className={`cursor-pointer p-2 rounded-md transition border ${
//                     notif.is_read
//                       ? 'bg-gray-50 dark:bg-gray-800'
//                       : 'bg-orange-50 dark:bg-orange-900 border-orange-500'
//                   }`}
//                 >
//                   <p className="text-sm font-medium">{notif.title}</p>
//                   <p className="text-xs text-gray-500">{notif.content}</p>
//                   <span className="text-xs text-gray-400 block mt-1">
//                     {new Date(notif.created_at).toLocaleString()}
//                   </span>
//                 </li>
//               ))}
//             </ul>

//             {loading && (
//               <p className="text-center text-xs text-gray-400 mt-2">{t('Loading...')}</p>
//             )}

//             {hasMore && !loading && notifications.length > 0 && (
//               <button
//                 onClick={() => {
//                   const nextPage = page + 1;
//                   setPage(nextPage);
//                   fetchNotifications(nextPage);
//                 }}
//                 className="text-sm mt-4 w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 py-2 rounded-md"
//               >
//                 {t('Load more')}
//               </button>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }








'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation'; // Import useRouter

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface NotificationBellProps {
  className?: string;
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
export const markNotificationAsRead = (notificationId: string): boolean => {
  try {
    // Get current marked read notifications from localStorage
    const cachedReadIds = localStorage.getItem('markedAsReadNotifications');
    let readIdsSet: Set<string> = new Set();

    if (cachedReadIds) {
      try {
        const readIdsArray = JSON.parse(cachedReadIds);
        readIdsSet = new Set(readIdsArray);
      } catch (err) {
        console.error('Failed to parse cached read notifications', err);
        // Reset if corrupted
        localStorage.removeItem('markedAsReadNotifications');
        readIdsSet = new Set();
      }
    }

    // Add this notification ID to the set
    readIdsSet.add(notificationId);

    // Save back to localStorage
    localStorage.setItem(
      'markedAsReadNotifications',
      JSON.stringify(Array.from(readIdsSet))
    );

    return true;
  } catch (err) {
    console.error(`Failed to mark notification ${notificationId} as read:`, err);
    return false;
  }
};

export default function NotificationBell({ className }: NotificationBellProps) {
  // Removed 'open' state as dropdown is removed
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>('');
  //const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  // Removed dropdownRef
  const wsRef = useRef<ExtendedWebSocket | null>(null);
  const wsReconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const { t } = useTranslation();
  const router = useRouter(); // Initialize useRouter

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

      // No API call - we're handling this client-side only
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

  const setupWebSocket = () => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      console.error('No access token found for WebSocket connection');
      setError(t('You must be logged in to receive real-time updates.'));
      setWsStatus('error');
      return;
    }

    // Validate token format to avoid obvious connection errors
    if (!accessToken.match(/^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)) {
      console.error('Invalid token format');
      setError(t('Authentication error. Please try logging in again.'));
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

      // Set a connection timeout
      const connectionTimeoutId = setTimeout(() => {
        console.error('WebSocket connection timeout');
        if (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) {
          wsRef.current.close();
          setWsStatus('disconnected');
          console.log(t('Connection timeout. Attempting to reconnect...'));
        }
      }, 10000); // 10 seconds timeout

      // Create new WebSocket connection
      const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(accessToken)}`;
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        clearTimeout(connectionTimeoutId);
        setWsStatus('connected');
        setError(null);
        wsReconnectAttempts.current = 0;

        // Set a ping interval to keep connection alive
        wsRef.current!.pingInterval = setInterval(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Send ping every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        console.log('WebSocket message received:', event.data);
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            console.log('WebSocket connection is alive');
            return;
          }

          // // Handle transaction link message
          // if (data.type === 'transaction_link' && data.url) {
          //   console.log('Opening transaction link:', data.url);
          //   window.open(data.url, '_blank', 'noopener,noreferrer');
          //   return;
          // }

          // Handle notification message
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
        clearTimeout(connectionTimeoutId);

        // Attempt to get more error details
        let errorMessage = t('Connection error. Please check your network.');
        if (error instanceof ErrorEvent && error.message) {
          errorMessage = `WebSocket error: ${error.message}`;
        }

        setError(errorMessage);
        setWsStatus('error');
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket connection closed', event);
        clearTimeout(connectionTimeoutId);

        // Clear ping interval if exists
        if (wsRef.current && wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }

        setWsStatus('disconnected');

        // Provide more context about the closure
        let reason = 'Connection closed';
        if (event.code) {
          switch (event.code) {
            case 1000:
              reason = 'Normal closure';
              break;
            case 1001:
              reason = 'Server going down or browser navigating away';
              break;
            case 1002:
              reason = 'Protocol error';
              break;
            case 1003:
              reason = 'Unsupported data';
              break;
            case 1006:
              reason = 'Abnormal closure, possibly network issue';
              break;
            case 1008:
              reason = 'Policy violation';
              break;
            case 1011:
              reason = 'Server error';
              break;
            case 1012:
              reason = 'Service restart';
              break;
            case 1013:
              reason = 'Service unavailable temporarily';
              break;
            default:
              reason = `Close code ${event.code}`;
          }
        }

        console.log('WebSocket close reason:', reason);

        // Attempt to reconnect after delay
        const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, wsReconnectAttempts.current));
        console.log(`Reconnecting in ${reconnectDelay / 1000} seconds...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          wsReconnectAttempts.current++;
          setupWebSocket();
        }, reconnectDelay);
      };
    } catch (error) {
      console.error('Failed to setup WebSocket:', error);
      setWsStatus('error');
      setError(t('Failed to establish real-time connection. Please try again.'));
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNotifications(1);

    // Setup WebSocket connection
    setupWebSocket();

    // Add event listener for page refresh/visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Fetch fresh data when page becomes visible again
        fetchNotifications(1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (wsRef.current) {
        if (wsRef.current.pingInterval) {
          clearInterval(wsRef.current.pingInterval);
        }
        wsRef.current.close();
        wsRef.current = null;
      }

      // Clean up event listener
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Fallback to polling every 60 seconds as a backup
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsStatus !== 'connected') {
        fetchNotifications(1); // Always fetch first page for polling updates
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [wsStatus]);

  // Removed useEffect for handleClickOutside

  return (
    <div className={`relative ${className ?? ''}`}> {/* Removed ref={dropdownRef} */}
      <button
        onClick={() => router.push('/notifications')} // Changed onClick to navigate
        className="relative p-1 rounded-full bg-transparent "
      >
        <Bell className="h-6 w-6" />
        {notifications.some((n) => !n.is_read) && (
          <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs px-1.5 rounded-full">
            {notifications.filter((n) => !n.is_read).length}
          </span>
        )}
      </button>

      {/* Removed the entire dropdown conditional rendering block */}
    </div>
  );
}
