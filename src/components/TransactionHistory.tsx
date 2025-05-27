// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { ArrowDownLeft, ArrowUpRight, RotateCw, X, MoreHorizontal, Pause, Play, Activity, Menu, Copy, } from 'lucide-react';
// //import Footer from '../components/footer';
// import { useTranslation } from 'react-i18next';
// import { useTheme } from './ThemeProvider';
// // Define the App interface
// interface App {
//   id: string;
//   name: string;
//   image: string;
//   public_name: string;
//   is_active: boolean;
// }

// // Define API response interfaces
// /**
//  * @typedef {Object} User
//  * @property {string} id
//  * @property {string} email
//  * @property {string} first_name
//  * @property {string} last_name
//  */
// interface User {
//   id: string;
//   email: string;
//   first_name: string;
//   last_name: string;
// }

// /**
//  * @typedef {Object} App
//  * @property {string} id
//  * @property {string} name
//  * @property {string} image
//  * @property {string} public_name
//  * @property {boolean} is_active
//  */

// /**
//  * @typedef {Object} Network
//  * @property {number} id
//  * @property {string} name
//  * @property {string} public_name
//  * @property {string} image
//  * @property {string} country_code
//  * @property {string} indication
//  */
// interface Network {
//   id: number;
//   name: string;
//   public_name: string;
//   image: string;
//   country_code: string;
//   indication: string;
// }

// /**
//  * @typedef {Object} Network
//  * @property {number} id
//  * @property {string} name
//  * @property {string} public_name
//  * @property {string} image
//  * @property {string} country_code
//  * @property {string} indication
//  */

// interface Transaction {
//   id: string;
//   amount: number;
//   reference: string;
//   type_trans: string;
//   status: string;
//   created_at: string;
//   phone_number: string;
//   app: App;
//   network: Network;
//   user: User;
//   user_app_id: string;
//   transaction_reference: string | null;
//   error_message: string | null;
//   net_payable_amount: number | null;
// }

// // Define the HistoricItem type
// type HistoricItem = {
//   id: string;
//   user: string;
//   created_at: string;
//   transaction: Transaction;
// };

// /**
//  * @typedef {Object} ApiResponse
//  * @property {number} count
//  * @property {string|null} next
//  * @property {string|null} previous
//  * @property {HistoricItem[]} results
//  */

// export default function TransactionHistory() {
//   const [transactions, setTransactions] = useState<HistoricItem[]>([]);
//   const [activeTab, setActiveTab] = useState('all');
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [page, setPage] = useState(1);
//   const [hasMore, setHasMore] = useState(true);
//   const [selectedTransaction, setSelectedTransaction] = useState<HistoricItem | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
//   const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
//   const [isNewTransaction, setIsNewTransaction] = useState<Record<string, boolean>>({});
//   const [wsStatus, setWsStatus] = useState('disconnected');
//   const [animateHeader, setAnimateHeader] = useState(false);
//   const {t} = useTranslation();
//   const { theme } = useTheme();
  
//   interface CustomWebSocket extends WebSocket {
//     pingInterval?: NodeJS.Timeout | null;
//   }
  
//   const webSocketRef = useRef<CustomWebSocket | null>(null);
//   const wsHealth = useRef({
//     lastMessageTime: 0,
//     messageCount: 0
//   });
  
//   // WebSocket reference
//   const webSocketReconnectAttempts = useRef(0);
//   // Transactions map to track unique transactions
//   const transactionsMapRef = useRef(new Map());
//   // Reconnect timeout reference for WebSocket
//   const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
//   // Format date from ISO string to readable format
//   const formatDate = (isoDate: string) => {
//     const date = new Date(isoDate);
//     return date.toLocaleDateString('en-US', {
//       day: '2-digit',
//       month: '2-digit',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: true
//     }).replace(',', '');
//   };
  
//   // Build API URL based on filters and pagination
//   const getApiUrl = (pageNumber: number, activeFilter: string) => {
//     let apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}` : ''}`;
    
//     if (activeFilter === 'deposits') {
//       apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}&` : '?'}type=deposit`;
//     } else if (activeFilter === 'withdrawals') {
//       apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}&` : '?'}type=withdrawal`;
//     }
    
//     return apiUrl;
//   };
  
//   // Create a function to generate a composite key for transactions
//   const getTransactionKey = (transaction: HistoricItem | Transaction) => {
//     // Check for different possible properties to handle various formats
//     const id = 'transaction' in transaction
//       ? transaction.transaction.id
//       : transaction.id;
    
//     if (!id) {
//       console.error('Could not extract ID from transaction:', transaction);
//       // Generate a fallback ID to prevent errors
//       return `unknown-${Math.random().toString(36).substring(2, 11)}`;
//     }
    
//     return id.toString();
//   };
  
//   // Add this function to cycle through filter options
//   const cycleMobileFilter = () => {
//     if (activeTab === 'all') {
//       handleTabChange('deposits');
//     } else if (activeTab === 'deposits') {
//       handleTabChange('withdrawals');
//     } else {
//       handleTabChange('all');
//     }
//   };
  
//   // Update the setupWebSocket function with better error handling and fallback
//   const setupWebSocket = () => {
//     if (!isRealTimeEnabled) {
//       cleanupWebSocket();
//       return;
//     }

//     const token = localStorage.getItem('accessToken');
//     if (!token) {
//       setError('Authentication required for real-time updates');
//       console.log(error);
//       setWsStatus('error');
//       window.location.href = '/';
//       return;
//     }

//     // Clean up existing connection
//     cleanupWebSocket();

//     try {
//       const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(token)}`;
//       webSocketRef.current = new WebSocket(wsUrl);

//       // Set connection timeout
//       const connectionTimeout = setTimeout(() => {
//         if (webSocketRef.current?.readyState !== WebSocket.OPEN) {
//           handleConnectionFailure('Connection timeout');
//         }
//       }, 5000);

//       webSocketRef.current.onopen = () => {
//         clearTimeout(connectionTimeout);
//         console.log('WebSocket connected successfully');
//         setWsStatus('connected');
//         setError(null);
//         webSocketReconnectAttempts.current = 0;
//         startPingInterval();
//       };

//       webSocketRef.current.onclose = (event) => {
//         clearTimeout(connectionTimeout);
//         handleWebSocketClose(event);
//       };

//       webSocketRef.current.onerror = (error) => {
//         console.error('WebSocket error:', error);
//         handleConnectionFailure('Connection failed');
//       };

//       webSocketRef.current.onmessage = handleWebSocketMessage;

//     } catch (error) {
//       console.error('WebSocket setup failed:', error);
//       setError(error instanceof Error ? error.message : 'Failed to establish connection');
//       setWsStatus('error');
//       handleConnectionFailure('Failed to initialize WebSocket');
//     }
//   };

//   // Add these helper functions
//   const cleanupWebSocket = () => {
//     if (webSocketRef.current) {
//       webSocketRef.current.close();
//       webSocketRef.current = null;
//     }
//     if (reconnectTimeoutRef.current) {
//       clearTimeout(reconnectTimeoutRef.current);
//     }
//     setWsStatus('disconnected');
//   };

//   const startPingInterval = () => {
//     const pingInterval = setInterval(() => {
//       if (webSocketRef.current?.readyState === WebSocket.OPEN) {
//         try {
//           webSocketRef.current.send(JSON.stringify({ type: 'ping' }));
//         } catch (error) {
//           console.error('Failed to send ping:', error);
//           cleanupWebSocket();
//           setupWebSocket();
//         }
//       } else {
//         clearInterval(pingInterval);
//       }
//     }, 30000);

//     // Store the interval ID for cleanup
//     if (webSocketRef.current) {
//       webSocketRef.current.pingInterval = pingInterval;
//     }
//   };

//   const handleConnectionFailure = (message: string) => {
//     console.error(message);
//     setWsStatus('error');
//     setError(message);
    
//     // Implement exponential backoff
//     const backoffDelay = Math.min(1000 * Math.pow(2, webSocketReconnectAttempts.current), 30000);
//     webSocketReconnectAttempts.current++;

//     reconnectTimeoutRef.current = setTimeout(() => {
//       if (isRealTimeEnabled) {
//         setupWebSocket();
//       }
//     }, backoffDelay);
//   };

//   const handleWebSocketMessage = (event: MessageEvent) => {
//     try {
//       const data = JSON.parse(event.data);
//       wsHealth.current = {
//         lastMessageTime: Date.now(),
//         messageCount: wsHealth.current.messageCount + 1
//       };

//       switch (data.type) {
//         case 'transaction_update':
//           handleTransactionUpdate(data.transaction);
//           break;
//         case 'new_transaction':
//           handleNewTransaction(data.transaction);
//           break;
//         case 'pong':
//           console.log('Received pong from server');
//           break;
//         case 'error':
//           console.error('Server error:', data.message);
//           setError(data.message);
//           break;
//         default:
//           if (data.transaction) {
//             const existingTransaction = transactionsMapRef.current.has(getTransactionKey(data.transaction));
//             if (existingTransaction) {
//               handleTransactionUpdate(data.transaction);
//             } else {
//               handleNewTransaction(data.transaction);
//             }
//           }
//       }

//       setLastFetchTime(new Date().toISOString());
//     } catch (error) {
//       console.error('Error processing message:', error);
//     }
//   };

//   const handleWebSocketClose = (event: CloseEvent) => {
//     cleanupWebSocket();
    
//     const reason = getCloseReason(event.code);
//     console.log(`WebSocket closed: ${reason}`);

//     if (isRealTimeEnabled && event.code !== 1000) {
//       handleConnectionFailure(reason);
//     }
//   };

//   const getCloseReason = (code: number): string => {
//     const closeReasons: Record<number, string> = {
//       1000: 'Normal closure',
//       1001: 'Going away',
//       1002: 'Protocol error',
//       1003: 'Unsupported data',
//       1005: 'No status received',
//       1006: 'Abnormal closure',
//       1007: 'Invalid frame payload data',
//       1008: 'Policy violation',
//       1009: 'Message too big',
//       1010: 'Mandatory extension',
//       1011: 'Internal server error',
//       1012: 'Service restart',
//       1013: 'Try again later',
//       1014: 'Bad gateway',
//       1015: 'TLS handshake'
//     };

//     return closeReasons[code] || `Unknown reason (${code})`;
//   };

//   // Handle new transaction from WebSocket
//   const handleNewTransaction = (transaction: Transaction) => {
//     const key = getTransactionKey(transaction);
    
//     // Only add if it matches the current filter
//     if (shouldShowTransaction(transaction)) {
//       // Check if we already have this transaction
//       if (!transactionsMapRef.current.has(key)) {
//         // Mark as new for animation
//         setIsNewTransaction(prev => ({
//           ...prev,
//           [key]: true
//         }));
        
//         // Create a proper HistoricItem
//         const historicItem: HistoricItem = {
//           id: transaction.id,
//           user: transaction.user?.id || '',
//           created_at: transaction.created_at,
//           transaction: transaction
//         };
        
//         // Add to our map
//         transactionsMapRef.current.set(key, historicItem);
        
//         // Add to state (at the beginning)
//         setTransactions(prev => [historicItem, ...prev]);
        
//         // Remove animation after 5 seconds
//         setTimeout(() => {
//           setIsNewTransaction(prev => {
//             const updated = { ...prev };
//             delete updated[key];
//             return updated;
//           });
//         }, 5000);
//       }
//     }
//   };
  
//   // Handle transaction updates from WebSocket
//   const handleTransactionUpdate = (updatedTransaction: Transaction) => {
//     const key = getTransactionKey(updatedTransaction);
    
//     console.log('Received update for transaction:', key, updatedTransaction);
//     console.log('Does this transaction exist in our map?', transactionsMapRef.current.has(key));
    
//     // Update the transaction in our state
//     setTransactions(prev => 
//       prev.map(item => {
//         if (getTransactionKey(item) === key) {
//           // Create updated item with new transaction data
//           return { 
//             ...item, 
//             transaction: updatedTransaction 
//           };
//         }
//         return item;
//       })
//     );
    
//     // Update the transaction in our map
//     if (transactionsMapRef.current.has(key)) {
//       const existingItem = transactionsMapRef.current.get(key);
//       if (existingItem) {
//         const updatedItem = {
//           ...existingItem,
//           transaction: updatedTransaction
//         };
//         transactionsMapRef.current.set(key, updatedItem);
//       }
//     }
    
//     // Highlight the updated transaction
//     setIsNewTransaction(prev => ({
//       ...prev,
//       [key]: true
//     }));
    
//     // Remove highlight after 5 seconds
//     setTimeout(() => {
//       setIsNewTransaction(prev => {
//         const updated = { ...prev };
//         delete updated[key];
//         return updated;
//       });
//     }, 5000);
//   };
  
//   // Filter transactions based on current filter
//   const shouldShowTransaction = (item: HistoricItem | Transaction) => {
//     const transaction = 'transaction' in item ? item.transaction : item;
    
//     if (!transaction) return false;
    
//     if (activeTab === 'all') {
//       return true;
//     } else if (activeTab === 'deposits') {
//       return transaction.type_trans === 'deposit';
//     } else if (activeTab === 'withdrawals') {
//       return transaction.type_trans === 'withdrawal';
//     }
//     return true;
//   };
  
//   // Fetch transactions from API
//   const fetchTransactions = async (pageNumber: number, activeFilter: string) => {
//     setLoading(true);
    
//     try {
//       const apiUrl = getApiUrl(pageNumber, activeFilter);
//       console.log('Fetching transactions from:', apiUrl);
      
//       const token = localStorage.getItem('accessToken');
//       if (!token) {
//         console.error('No access token found');
//         setError('You must be logged in to view transactions.');
//         setLoading(false);
//         return;
//       }
      
//       const response = await fetch(apiUrl, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           'Content-Type': 'application/json',
//         },
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         console.error('Error Data:', errorData);
//         throw new Error(errorData.message);
//       }
      
//       const data = await response.json();
//       console.log('Fetched Transactions:', data);
      
//       // Update last fetch time
//       setLastFetchTime(new Date().toISOString());
      
//       // Process the fetched transactions
//       if (pageNumber === 1) {
//         // Reset the transactions map for first page
//         transactionsMapRef.current.clear();
        
//         // Check if we got any transactions
//         if (data.results && data.results.length > 0) {
//           // Add each transaction to the map
//           data.results.forEach((tx: HistoricItem) => {
//             const key = getTransactionKey(tx);
//             transactionsMapRef.current.set(key, tx);
//           });
          
//           setTransactions(data.results);
//         } else {
//           // No transactions found
//           setTransactions([]);
//         }
//       } else {
//         // For pagination, only add transactions that don't already exist
//         const newTransactions = data.results.filter((tx: HistoricItem) => {
//           const key = getTransactionKey(tx);
//           if (!transactionsMapRef.current.has(key)) {
//             transactionsMapRef.current.set(key, tx);
//             return true;
//           }
//           return false;
//         });
        
//         setTransactions(prev => [...prev, ...newTransactions]);
//       }
      
//       setHasMore(data.next !== null);
//       setError(null);
//     } catch (error) {
//       console.error('Error fetching transactions:', error);
//       if (error instanceof Error) {
//         setError(error.message || 'Failed to load transactions. Please try again.');
//         console.error('Error message:', error.message);
//       } else {
//         setError('Failed to load transactions. Please try again.');
//         console.error('Unknown error:', error);
//       }
      
//       // Set empty transactions if API failed
//       if (pageNumber === 1) {
//         setTransactions([]);
//         transactionsMapRef.current.clear();
//       }
//     } finally {
//       setLoading(false);
//     }
//   };
  
//   // Initial fetch and WebSocket setup
//   useEffect(() => {
//     // Trigger animation
//     setTimeout(() => {
//       setAnimateHeader(true);
//     }, 500);
    
//     fetchTransactions(page, activeTab);
    
//     // Setup WebSocket connection
//     setupWebSocket();
    
//     // Add health check interval for WebSocket
//     const healthCheckInterval = setInterval(() => {
//       const now = Date.now();
//       const minutesSinceLastMessage = (now - wsHealth.current.lastMessageTime) / (1000 * 60);
      
//       if (wsHealth.current.lastMessageTime > 0 && minutesSinceLastMessage > 5) {
//         console.warn('No WebSocket messages received in 5 minutes, reconnecting...');
//         setupWebSocket(); // Force reconnection
//       }
//     }, 60000); // Check every minute
    
//     // Cleanup function
//     return () => {
//       clearInterval(healthCheckInterval);
//       if (webSocketRef.current) {
//         // Clear ping interval if exists
//         if (webSocketRef.current.pingInterval) {
//           clearInterval(webSocketRef.current.pingInterval);
//         }
        
//         webSocketRef.current.close();
//         webSocketRef.current = null;
//       }
      
//       // Clear any pending reconnection timeouts
//       if (reconnectTimeoutRef.current) {
//         clearTimeout(reconnectTimeoutRef.current);
//       }
//     };
//   }, []);
  
//   // Verify WebSocket connection after initial setup
//   useEffect(() => {
//     // Verify connection after initial setup
//     const verifyConnectionTimeout = setTimeout(() => {
//       // If we haven't received any messages after 10 seconds of setup
//       if (wsHealth.current.messageCount === 0 && webSocketRef.current && 
//           webSocketRef.current.readyState === WebSocket.OPEN) {
//         console.log('Testing WebSocket connection with manual ping...');
//         try {
//           webSocketRef.current.send(JSON.stringify({ type: 'ping' }));
//         } catch (error) {
//           console.error('Failed to send ping, reconnecting WebSocket:', error);
//           setupWebSocket();
//         }
//       }
//     }, 10000);
    
//     return () => clearTimeout(verifyConnectionTimeout);
//   }, []);
  
//   // Update WebSocket when real-time setting changes
//   useEffect(() => {
//     setupWebSocket();
//   }, [isRealTimeEnabled]);
  
//   // Reset page when tab changes to refetch from the beginning
//   useEffect(() => {
//     setPage(1);
//     fetchTransactions(1, activeTab);
//   }, [activeTab]);
  
//   // Load more transactions when scrolling to bottom
//   const loadMore = () => {
//     if (!loading && hasMore) {
//       const nextPage = page + 1;
//       setPage(nextPage);
//       fetchTransactions(nextPage, activeTab);
//     }
//   };
  
//   // Handle tab change
//   const handleTabChange = (tab: string) => {
//     setActiveTab(tab);
//   };
  
//   // Toggle real-time updates
//   const toggleRealTimeUpdates = () => {
//     const newState = !isRealTimeEnabled;
//     setIsRealTimeEnabled(newState);
//     // Update localStorage preference
//     localStorage.setItem('realTimeEnabled', newState.toString());
//   };
  
//   // Function to refresh transactions manually
//   const refreshTransactions = () => {
//     setPage(1);
//     fetchTransactions(1, activeTab);
//   };
  
//   // Show transaction details in modal
//   const openTransactionDetails = (transaction: HistoricItem) => {
//     setSelectedTransaction(transaction);
//     setIsModalOpen(true);
//   };
  
//   // Copy transaction ID or reference to clipboard
//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text)
//       .then(() => {
//         // Could add a toast notification here
//         console.log('Copied to clipboard:', text);
//       })
//       .catch(err => {
//         console.error('Failed to copy:', err);
//       });
//   };
  
//   // Format the transaction amount with currency symbol
//   const formatAmount = (amount: number) => {
//     return new Intl.NumberFormat('fr-BJ', {
//       style: 'currency',
//       currency: 'XOF',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0
//     }).format(amount);
//   };
  
//   // Get status badge class based on transaction status
//   const getStatusBadgeClass = (status: string) => {
//     switch (status.toLowerCase()) {
//       case 'completed':
//       case 'success':
//         return 'text-green-500';
//       case 'pending':
//         return 'text-amber-500';
//       case 'failed':
//       case 'error':
//         return 'text-red-500';
//       default:
//         return 'text-gray-500';
//     }
//   };
  
//   // Get transaction type icon based on type
//   const getTransactionTypeIcon = (type: string) => {
//     if (type === 'deposit') {
//       return <ArrowDownLeft className="w-5 h-5 text-orange-500 group-hover:animate-bounce" />;
//     } else if (type === 'withdrawal') {
//       return <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:animate-pulse" />;
//     }
//     return null;
//   };
  
//   return (
//     <div className={`flex flex-col h-full min-h-screen bg-gradient-to-br  ${theme.colors.text} font-sans relative overflow-hidden`}>
//       {/* Background gradient effects */}
//       <div className="absolute top-20 -left-10 w-40 h-40 bg-orange-700/20 rounded-full blur-3xl animate-pulse-slow"></div>
//       <div className="absolute bottom-20 right-10 w-60 h-60 bg-purple-700/10 rounded-full blur-3xl animate-pulse-slow"></div>
//      <div className=" shadow-md rounded-2xl  w-full overflow-hidden">
//         {/* Header with title and controls */}
//         <div className={` p-4 flex flex-col sm:flex-row justify-between items-center transition-all duration-500 backdrop-blur-sm shadow-xl relative overflow-hidden ${animateHeader ? 'animate-fadeIn' : 'opacity-0'}`} style={{animationDelay: '600ms'}}>
//         <div className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-xl animate-pulse-slow"></div>
        
//             <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-6 space-y-9 md:space-y-0">
//               {/* Left side - Title and refresh button */}
//               <div className="flex items-center gap-2 group mb-4 md:mb-0">
//                 <Activity size={18} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0" />
//                 <h2 className="text-lg font-semibold group-hover:translate-x-1 transition-transform">{t("Transaction History")}</h2>
//                 <RotateCw 
//                   size={16} 
//                   className="text-gray-400 cursor-pointer hover:text-gray-700 transition-colors hover:rotate-180 duration-500"
//                   onClick={refreshTransactions}
//                 />
//               </div>

//               {/* Right side - Navigation tabs with added margin-top */}
//               {/* <div className="hidden md:flex gap-4 text-sm mt-4 md:mt-0 md:ml-8">
//                 <button 
//                   className={`${activeTab === 'all' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
//                   onClick={() => setActiveTab('all')}
//                 >
//                   {t("See All ")}
//                   <span className="text-xs text-gray-500">.</span>
//                 </button>
//                 <button 
//                   className={`${activeTab === 'deposits' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
//                   onClick={() => handleTabChange('deposits')}
//                 >
//                   {t("See Deposits ")}
//                   <span className="text-xs text-gray-500">.</span>
//                 </button>
//                 <button 
//                   className={`${activeTab === 'withdrawals' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
//                   onClick={() => handleTabChange('withdrawals')}
//                 >
//                   {t("See Withdrawals")} 
//                   <span className="text-xs text-gray-500">.</span>
//                 </button>
//               </div> */}
//             </div>

//         </div>
        
//         {/* Transaction list */}
//         <div className="space-y-3 pb-4">
//               {loading && page === 1 ? (
//                 <div className="flex justify-center items-center py-10">
//                   <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
//                 </div>
//               ) : transactions.length === 0 ? (
//                 <div className="flex flex-col items-center justify-center py-10 px-4">
//                   <div className="bg-gray-800/50 rounded-full p-4 mb-4">
//                     <Activity className="w-8 h-8 text-gray-400" />
//                   </div>
//                   <h3 className="text-lg font-medium text-gray-400 mb-2">No transactions found</h3>
//                   <p className="text-sm text-gray-500 text-center">
//                     {activeTab === 'all' 
//                       ? t("You haven't made any transactions yet.")
//                       : activeTab === 'deposits'
//                       ? t("No deposits have been made yet.")
//                       : t("No withdrawals have been made yet.")}
//                   </p>
//                 </div>
//             ) : ( 
//               transactions.map((item, index) => (
//                 <div
//                   key={item.id}
//                   className={`rounded-lg p-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-orange-900/10 group animate-fadeIn bg-gradient-to-br ${theme.colors.c_background} ${theme.colors.hover} ${
//                     isNewTransaction[getTransactionKey(item)] ? 'animate-highlight' : ''
//                   }`}
//                   onClick={() => openTransactionDetails(item)}
//                   style={{ animationDelay: `${(index + 1) * 150}ms` }}
//                 >
//                   <div className="flex justify-between items-start">
//                     <div className="flex items-center">
//                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
//                         item.transaction.type_trans === 'deposit' 
//                           ? 'bg-orange-500/20 text-orange-500' 
//                           : 'bg-gray-700/50 text-gray-300'
//                         } relative overflow-hidden group-hover:scale-110 transition-transform`}>
//                         {getTransactionTypeIcon(item.transaction.type_trans)}
//                         <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
//                       </div>
//                       <div className="ml-3 group-hover:translate-x-1 transition-transform">
//                         <div className="flex items-center">
//                           <span className="font-medium dark:text-white">
//                             {item.transaction.type_trans === 'deposit' ? 'Deposit' : 'Withdrawal'}
//                           </span>
//                           <span className={`text-xs ml-2 px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusBadgeClass(item.transaction.status)} group-hover:scale-110 transition-transform relative`}>
//                             {item.transaction.status}
//                             <span className={`absolute -bottom-1 left-0 h-0.5 w-0 ${
//                               item.transaction.status.toLowerCase() === 'pending' 
//                                 ? 'bg-amber-500' 
//                                 : item.transaction.status.toLowerCase() === 'completed' || item.transaction.status.toLowerCase() === 'success'
//                                   ? 'bg-green-500' 
//                                   : 'bg-red-500'
//                             } group-hover:w-full transition-all duration-300`}></span>
//                           </span>
//                         </div>
//                         <div className="text-sm text-gray-500 dark:text-gray-400">
//                           {item.transaction.phone_number}
//                         </div>
//                         <div className="text-xs text-gray-400 dark:text-gray-500">
//                           {formatDate(item.transaction.created_at)}
//                         </div>
//                       </div>
//                     </div>
//                     <div className="text-right">
//                       <div className={`font-bold ${
//                         item.transaction.type_trans === 'deposit' 
//                           ? 'text-orange-600 dark:text-orange-400' 
//                           : 'text-blue-600 dark:text-blue-400'
//                       }`}>
//                         {formatAmount(item.transaction.amount)}
//                       </div>
//                       <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-orange-400 transition-colors">
//                         Ref: {item.transaction.reference.substring(0, 8)}...
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               ))
//             )}
              
//               {/* Loading more indicator */}
//               {loading && page > 1 && (
//                 <div className="flex justify-center items-center py-4">
//                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
//                 </div>
//               )}
              
//               {/* Load more button */}
//               {!loading && hasMore && (
//                 <div className="flex justify-center mt-4">
//                   <button
//                     onClick={loadMore}
//                     className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
//                   >
//                     <MoreHorizontal size={16} />
//                     {t("Load More")}
//                   </button>
//                 </div>
//               )}
              
//               {/* Last updated info */}
//               {lastFetchTime && (
//                 <div className="text-xs text-center text-gray-500 mt-4">
//                   {t("Last updated")}: {formatDate(lastFetchTime)}
//                 </div>
//               )}
//         </div>
        
//         {/* WebSocket connection status */}
//         <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-full backdrop-blur-sm text-xs">
//           <div className={`w-2 h-2 rounded-full ${
//             wsStatus === 'connected' ? 'bg-green-500' : 
//             wsStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
//           } ${wsStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
//           <span className="text-gray-300">
//             {wsStatus === 'connected' ? t('Live Updates') : 
//              wsStatus === 'error' ? t('Connection Error') : t('Connecting...')}
//           </span>
//           <button 
//             onClick={toggleRealTimeUpdates}
//             className="ml-1"
//             title={isRealTimeEnabled ? t('Disable live updates') : t('Enable live updates')}
//           >
//             {isRealTimeEnabled ? 
//               <Pause size={14} className="text-gray-400 hover:text-white transition-colors" /> : 
//               <Play size={14} className="text-gray-400 hover:text-white transition-colors" />
//             }
//           </button>
//         </div>
        
//         {/* Transaction detail modal */}
//         {isModalOpen && selectedTransaction && (
//           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//             <div className={`bg-gradient-to-br ${theme.colors.c_background} rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scaleIn`}>
//               <div className="flex justify-between items-start mb-6">
//                 <h3 className="text-lg font-semibold">Transaction Details</h3>
//                 <button 
//                   onClick={() => setIsModalOpen(false)}
//                   className="text-gray-500 hover:text-gray-300 transition-colors"
//                 >
//                   <X size={20} />
//                 </button>
//               </div>
              
//               <div className="space-y-4">
//                 {/* Transaction type */}
//                 <div className="flex items-center gap-3">
//                   <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
//                     selectedTransaction.transaction.type_trans === 'deposit' 
//                       ? 'bg-orange-500/20 text-orange-500' 
//                       : 'bg-gray-700/50 text-gray-300'
//                   }`}>
//                     {getTransactionTypeIcon(selectedTransaction.transaction.type_trans)}
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2">
//                       <span className="font-medium text-lg">
//                         {selectedTransaction.transaction.type_trans === 'deposit' ? 'Deposit' : 'Withdrawal'}
//                       </span>
//                       <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadgeClass(selectedTransaction.transaction.status)}`}>
//                         {selectedTransaction.transaction.status}
//                       </span>
//                     </div>
//                     <div className="text-sm text-gray-500">
//                       {formatDate(selectedTransaction.transaction.created_at)}
//                     </div>
//                   </div>
//                 </div>
                
//                 {/* Amount */}
//                 <div className="bg-gray-800/30 p-4 rounded-xl">
//                   <div className="text-sm text-gray-500 mb-1">{t("Amount")}</div>
//                   <div className={`text-2xl font-bold ${
//                     selectedTransaction.transaction.type_trans === 'deposit' 
//                       ? 'text-orange-500' 
//                       : 'text-blue-500'
//                   }`}>
//                     {formatAmount(selectedTransaction.transaction.amount)}
//                   </div>
//                 </div>
                
//                 {/* Details list */}
//                 <div className="space-y-3">
//                   {/* Transaction ID */}
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-gray-500">{t("Transaction ID")}</span>
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm">{selectedTransaction.transaction.id}</span>
//                       <button 
//                         onClick={() => copyToClipboard(selectedTransaction.transaction.id.toString())}
//                         className="text-gray-500 hover:text-gray-300"
//                       >
//                         <Copy size={14} />
//                       </button>
//                     </div>
//                   </div>
                  
//                   {/* Reference */}
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-gray-500">{t("Reference")}</span>
//                     <div className="flex items-center gap-2">
//                       <span className="text-sm">{selectedTransaction.transaction.reference}</span>
//                       <button 
//                         onClick={() => copyToClipboard(selectedTransaction.transaction.reference)}
//                         className="text-gray-500 hover:text-gray-300"
//                       >
//                         <Copy size={14} />
//                       </button>
//                     </div>
//                   </div>
                  
//                   {/* Phone Number */}
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-gray-500">{t("Phone Number")}</span>
//                     <span className="text-sm">{selectedTransaction.transaction.phone_number}</span>
//                   </div>
                  
//                   {/* Network */}
//                   {selectedTransaction.transaction.network && (
//                     <div className="flex justify-between items-center">
//                       <span className="text-sm text-gray-500">{t("Network")}</span>
//                       <span className="text-sm">{selectedTransaction.transaction.network.public_name || selectedTransaction.transaction.network.name}</span>
//                     </div>
//                   )}
                  
//                   {/* Status */}
//                   <div className="flex justify-between items-center">
//                     <span className="text-sm text-gray-500">{t("Status")}</span>
//                     <span className={`text-sm font-medium ${getStatusBadgeClass(selectedTransaction.transaction.status)}`}>
//                       {selectedTransaction.transaction.status}
//                     </span>
//                   </div>
//                 </div>
//               </div>
              
//               <div className="mt-6 flex justify-end">
//                 <button
//                   onClick={() => setIsModalOpen(false)}
//                   className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
//                 >
//                   {t("Close")}
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }












'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, RotateCw, X, Activity, Copy, } from 'lucide-react';
//import Footer from '../components/footer';
import { useTranslation } from 'react-i18next';
import { useTheme } from './ThemeProvider';
// Import Link for navigation (assuming Next.js or similar)
import Link from 'next/link'; // Assuming Next.js

// Define the App interface
interface App {
  id: string;
  name: string;
  image: string;
  public_name: string;
  is_active: boolean;
}

// Define API response interfaces
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} first_name
 * @property {string} last_name
 */
interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

/**
 * @typedef {Object} App
 * @property {string} id
 * @property {string} name
 * @property {string} image
 * @property {string} public_name
 * @property {boolean} is_active
 */

/**
 * @typedef {Object} Network
 * @property {number} id
 * @property {string} name
 * @property {string} public_name
 * @property {string} image
 * @property {string} country_code
 * @property {string} indication
 */
interface Network {
  id: number;
  name: string;
  public_name: string;
  image: string;
  country_code: string;
  indication: string;
}

/**
 * @typedef {Object} Network
 * @property {number} id
 * @property {string} name
 * @property {string} public_name
 * @property {string} image
 * @property {string} country_code
 * @property {string} indication
 */

interface Transaction {
  id: string;
  amount: number;
  reference: string;
  type_trans: string;
  status: string;
  created_at: string;
  phone_number: string;
  app: App;
  network: Network;
  user: User;
  user_app_id: string;
  transaction_reference: string | null;
  error_message: string | null;
  net_payable_amount: number | null;
}

// Define the HistoricItem type
type HistoricItem = {
  id: string;
  user: string;
  created_at: string;
  transaction: Transaction;
};

/**
 * @typedef {Object} ApiResponse
 * @property {number} count
 * @property {string|null} next
 * @property {string|null} previous
 * @property {HistoricItem[]} results
 */

export default function TransactionHistory() {
  const [transactions, setTransactions] = useState<HistoricItem[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<HistoricItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string | null>(null);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [isNewTransaction, setIsNewTransaction] = useState<Record<string, boolean>>({});
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [animateHeader, setAnimateHeader] = useState(false);
  const {t} = useTranslation();
  const { theme } = useTheme();

  interface CustomWebSocket extends WebSocket {
    pingInterval?: NodeJS.Timeout | null;
  }

  const webSocketRef = useRef<CustomWebSocket | null>(null);
  const wsHealth = useRef({
    lastMessageTime: 0,
    messageCount: 0
  });

  // WebSocket reference
  const webSocketReconnectAttempts = useRef(0);
  // Transactions map to track unique transactions
  const transactionsMapRef = useRef(new Map());
  // Reconnect timeout reference for WebSocket
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Format date from ISO string to readable format
  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC'
    });
  };

  // Build API URL based on filters and pagination
  const getApiUrl = (pageNumber: number, activeFilter: string) => {
    let apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}` : ''}`;

    if (activeFilter === 'deposits') {
      apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}&` : '?'}type=deposit`;
    } else if (activeFilter === 'withdrawals') {
      apiUrl = `https://api.yapson.net/yapson/historic${pageNumber > 1 ? `?page=${pageNumber}&` : '?'}type=withdrawal`;
    }

    return apiUrl;
  };

  // Create a function to generate a composite key for transactions
  const getTransactionKey = (transaction: HistoricItem | Transaction) => {
    // Check for different possible properties to handle various formats
    const id = 'transaction' in transaction
      ? transaction.transaction.id
      : transaction.id;

    if (!id) {
      console.error('Could not extract ID from transaction:', transaction);
      // Generate a fallback ID to prevent errors
      return `unknown-${Math.random().toString(36).substring(2, 11)}`;
    }

    return id.toString();
  };

  // Add this function to cycle through filter options
  const cycleMobileFilter = () => {
    if (activeTab === 'all') {
      handleTabChange('deposits');
    } else if (activeTab === 'deposits') {
      handleTabChange('withdrawals');
    } else {
      handleTabChange('all');
    }
  };

  // Update the setupWebSocket function with better error handling and fallback
  const setupWebSocket = () => {
    if (!isRealTimeEnabled) {
      cleanupWebSocket();
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setError('Authentication required for real-time updates');
      console.log(error);
      setWsStatus('error');
      window.location.href = '/';
      return;
    }

    // Clean up existing connection
    cleanupWebSocket();

    try {
      const wsUrl = `wss://api.yapson.net/ws/socket?token=${encodeURIComponent(token)}`;
      webSocketRef.current = new WebSocket(wsUrl);

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (webSocketRef.current?.readyState !== WebSocket.OPEN) {
          handleConnectionFailure('Connection timeout');
        }
      }, 5000);

      webSocketRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket connected successfully');
        setWsStatus('connected');
        setError(null);
        webSocketReconnectAttempts.current = 0;
        startPingInterval();
      };

      webSocketRef.current.onclose = (event) => {
        clearTimeout(connectionTimeout);
        handleWebSocketClose(event);
      };

      webSocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        handleConnectionFailure('Connection failed');
      };

      webSocketRef.current.onmessage = handleWebSocketMessage;

    } catch (error) {
      console.error('WebSocket setup failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to establish connection');
      setWsStatus('error');
      handleConnectionFailure('Failed to initialize WebSocket');
    }
  };

  // Add these helper functions
  const cleanupWebSocket = () => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setWsStatus('disconnected');
  };

  const startPingInterval = () => {
    const pingInterval = setInterval(() => {
      if (webSocketRef.current?.readyState === WebSocket.OPEN) {
        try {
          webSocketRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send ping:', error);
          cleanupWebSocket();
          setupWebSocket();
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);

    // Store the interval ID for cleanup
    if (webSocketRef.current) {
      webSocketRef.current.pingInterval = pingInterval;
    }
  };

  const handleConnectionFailure = (message: string) => {
    console.error(message);
    setWsStatus('error');
    setError(message);

    // Implement exponential backoff
    const backoffDelay = Math.min(1000 * Math.pow(2, webSocketReconnectAttempts.current), 30000);
    webSocketReconnectAttempts.current++;

    console.log(`Attempting to reconnect in ${backoffDelay / 1000} seconds...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isRealTimeEnabled) {
        setupWebSocket();
      }
    }, backoffDelay);
  };

  const handleWebSocketMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('Received WebSocket message:', data);
      wsHealth.current = {
        lastMessageTime: Date.now(),
        messageCount: wsHealth.current.messageCount + 1
      };

      switch (data.type) {
        case 'transaction_update':
          console.log('Received transaction update:', data.transaction);
          handleTransactionUpdate(data.transaction);
          break;
        case 'new_transaction':
          console.log('Received new transaction:', data.transaction);
          handleNewTransaction(data.transaction);
          break;
        case 'transaction_link':
          const url = data.url || data.data; // Handle both formats
          console.log('Transaction link received:', { url, fullData: data });
          
          if (url) {
            try {
              const newWindow = window.open('', '_blank');
              if (newWindow) {
                newWindow.location.href = url;
              } else {
                console.warn('Popup was blocked, falling back to direct window.open');
                window.open(url, '_blank', 'noopener,noreferrer');
              }
            } catch (err) {
              console.error('Error opening URL:', err);
              // Fallback to showing the URL to the user
              const shouldOpen = window.confirm(`Open payment link? ${url}`);
              if (shouldOpen) {
                window.location.href = url;
              }
            }
          }
          break;
        case 'pong':
          console.log('Received pong from server');
          break;
        case 'error':
          console.error('Server error:', data.message);
          setError(data.message);
          break;
        default:
          if (data.transaction) {
            const existingTransaction = transactionsMapRef.current.has(getTransactionKey(data.transaction));
            if (existingTransaction) {
              handleTransactionUpdate(data.transaction);
            } else {
              handleNewTransaction(data.transaction);
            }
          }
      }

      setLastFetchTime(new Date().toISOString());
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  const handleWebSocketClose = (event: CloseEvent) => {
    cleanupWebSocket();

    const reason = getCloseReason(event.code);
    console.log(`WebSocket closed: ${reason}`);

    if (isRealTimeEnabled && event.code !== 1000) {
      handleConnectionFailure(reason);
    }
  };

  const getCloseReason = (code: number): string => {
    const closeReasons: Record<number, string> = {
      1000: 'Normal closure',
      1001: 'Going away',
      1002: 'Protocol error',
      1003: 'Unsupported data',
      1005: 'No status received',
      1006: 'Abnormal closure',
      1007: 'Invalid frame payload data',
      1008: 'Policy violation',
      1009: 'Message too big',
      1010: 'Mandatory extension',
      1011: 'Internal server error',
      1012: 'Service restart',
      1013: 'Try again later',
      1014: 'Bad gateway',
      1015: 'TLS handshake'
    };

    return closeReasons[code] || `Unknown reason (${code})`;
  };

  // Handle new transaction from WebSocket
  const handleNewTransaction = (transaction: Transaction) => {
    const key = getTransactionKey(transaction);

    // Only add if it matches the current filter
    if (shouldShowTransaction(transaction)) {
      // Check if we already have this transaction
      if (!transactionsMapRef.current.has(key)) {
        // Mark as new for animation
        setIsNewTransaction(prev => ({
          ...prev,
          [key]: true
        }));

        // Create a proper HistoricItem
        const historicItem: HistoricItem = {
          id: transaction.id,
          user: transaction.user?.id || '',
          created_at: transaction.created_at,
          transaction: transaction
        };

        // Add to our map
        transactionsMapRef.current.set(key, historicItem);

        // Add to state (at the beginning)
        setTransactions(prev => [historicItem, ...prev]);

        // Remove animation after 5 seconds
        setTimeout(() => {
          setIsNewTransaction(prev => {
            const updated = { ...prev };
            delete updated[key];
            return updated;
          });
        }, 5000);
      }
    }
  };

  // Handle transaction updates from WebSocket
  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
    const key = getTransactionKey(updatedTransaction);

    console.log('Received update for transaction:', key, updatedTransaction);
    console.log('Does this transaction exist in our map?', transactionsMapRef.current.has(key));

    // Update the transaction in our state
    setTransactions(prev =>
      prev.map(item => {
        if (getTransactionKey(item) === key) {
          // Create updated item with new transaction data
          return {
            ...item,
            transaction: updatedTransaction
          };
        }
        return item;
      })
    );

    // Update the transaction in our map
    if (transactionsMapRef.current.has(key)) {
      const existingItem = transactionsMapRef.current.get(key);
      if (existingItem) {
        const updatedItem = {
          ...existingItem,
          transaction: updatedTransaction
        };
        transactionsMapRef.current.set(key, updatedItem);
      }
    }

    // Highlight the updated transaction
    setIsNewTransaction(prev => ({
      ...prev,
      [key]: true
    }));

    // Remove highlight after 5 seconds
    setTimeout(() => {
      setIsNewTransaction(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }, 5000);
  };

  // Filter transactions based on current filter
  const shouldShowTransaction = (item: HistoricItem | Transaction) => {
    const transaction = 'transaction' in item ? item.transaction : item;

    if (!transaction) return false;

    if (activeTab === 'all') {
      return true;
    } else if (activeTab === 'deposits') {
      return transaction.type_trans === 'deposit';
    } else if (activeTab === 'withdrawals') {
      return transaction.type_trans === 'withdrawal';
    }
    return true;
  };

  // Fetch transactions from API (paginated for this component)
  const fetchTransactions = async (pageNumber: number, activeFilter: string) => {
    setLoading(true);

    try {
      const apiUrl = getApiUrl(pageNumber, activeFilter);
      console.log('Fetching transactions from:', apiUrl);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        setError('You must be logged in to view transactions.');
        setLoading(false);
        return;
      }

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error Data:', errorData);
        throw new Error(errorData.message);
      }

      const data = await response.json();
      console.log('Fetched Transactions:', data);

      // Update last fetch time
      setLastFetchTime(new Date().toISOString());

      // Process the fetched transactions
      if (pageNumber === 1) {
        // Reset the transactions map for first page
        transactionsMapRef.current.clear();

        // Check if we got any transactions
        if (data.results && data.results.length > 0) {
          // Add each transaction to the map
          data.results.forEach((tx: HistoricItem) => {
            const key = getTransactionKey(tx);
            transactionsMapRef.current.set(key, tx);
          });

          setTransactions(data.results);
        } else {
          // No transactions found
          setTransactions([]);
        }
                // For pagination, only add transactions that don't already exist
        const newTransactions = data.results.filter((tx: HistoricItem) => {
        const key = getTransactionKey(tx);
        if (!transactionsMapRef.current.has(key)) {
            transactionsMapRef.current.set(key, tx);
            return true;
        }
        return false;
        });

        setTransactions(prev => [...prev, ...newTransactions]);

      }

      setHasMore(data.next !== null);
      setError(null);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      if (error instanceof Error) {
        setError(error.message || 'Failed to load transactions. Please try again.');
        console.error('Error message:', error.message);
      } else {
        setError('Failed to load transactions. Please try again.');
        console.error('Unknown error:', error);
      }

      // Set empty transactions if API failed
      if (pageNumber === 1) {
        setTransactions([]);
        transactionsMapRef.current.clear();
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and WebSocket setup
  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => {
      setAnimateHeader(true);
    }, 500);

    fetchTransactions(page, activeTab);

    // Setup WebSocket connection - always attempt to connect if user is authenticated
    const token = localStorage.getItem('accessToken');
    if (token) {
      setupWebSocket();
    }

    // Add health check interval for WebSocket
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const minutesSinceLastMessage = (now - wsHealth.current.lastMessageTime) / (1000 * 60);

      if (wsHealth.current.lastMessageTime > 0 && minutesSinceLastMessage > 5) {
        console.warn('No WebSocket messages received in 5 minutes, reconnecting...');
        setupWebSocket(); // Force reconnection
      }
    }, 60000); // Check every minute

    // Cleanup function
    return () => {
      clearTimeout(timer);
      clearInterval(healthCheckInterval);
      if (webSocketRef.current) {
        // Clear ping interval if exists
        if (webSocketRef.current.pingInterval) {
          clearInterval(webSocketRef.current.pingInterval);
        }

        webSocketRef.current.close();
        //webSocketRef.current = null;
      }

      // Clear any pending reconnection timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  

  // Verify WebSocket connection after initial setup
  useEffect(() => {
    // Verify connection after initial setup
    const verifyConnectionTimeout = setTimeout(() => {
      // If we haven't received any messages after 10 seconds of setup
      if (wsHealth.current.messageCount === 0 && webSocketRef.current &&
          webSocketRef.current.readyState === WebSocket.OPEN) {
        console.log('Testing WebSocket connection with manual ping...');
        try {
          webSocketRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          console.error('Failed to send ping, reconnecting WebSocket:', error);
          setupWebSocket();
        }
      }
    }, 10000);

    return () => clearTimeout(verifyConnectionTimeout);
  }, []);

  // Update WebSocket when real-time setting changes
  useEffect(() => {
    setupWebSocket();
  }, [isRealTimeEnabled]);

  // Reset page when tab changes to refetch from the beginning
  useEffect(() => {
    setPage(1);
    fetchTransactions(1, activeTab);
  }, [activeTab]);

  // Load more transactions when scrolling to bottom (This will be removed or changed)
  // const loadMore = () => {
  //   if (!loading && hasMore) {
  //     const nextPage = page + 1;
  //     setPage(nextPage);
  //     fetchTransactions(nextPage, activeTab);
  //   }
  // };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Toggle real-time updates
  const toggleRealTimeUpdates = () => {
    const newState = !isRealTimeEnabled;
    setIsRealTimeEnabled(newState);
    // Update localStorage preference
    localStorage.setItem('realTimeEnabled', newState.toString());
  };

  // Function to refresh transactions manually
  const refreshTransactions = () => {
    setPage(1);
    fetchTransactions(1, activeTab);
  };

  // Show transaction details in modal
  const openTransactionDetails = (transaction: HistoricItem) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  // Copy transaction ID or reference to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Could add a toast notification here
        console.log('Copied to clipboard:', text);
      })
      .catch(err => {
        console.error('Failed to copy:', err);
      });
  };

  // Format the transaction amount with currency symbol
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-BJ', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status badge class based on transaction status
  const getStatusBadgeClass = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
    case 'accept':
      return 'text-green-500';
    case 'pending':
      return 'text-amber-500';
    case 'failed':
    case 'error':
      return 'text-red-500';
    default:
      return 'text-gray-500';
  }
};

const StatusBadge = ({ status }: { status: string }) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      completed: { text: 'Completed', className: 'bg-green-500/10 text-green-500' },
      accept: { text: 'Accepted', className: 'bg-green-500/10 text-green-500' },
      pending: { text: 'Pending', className: 'bg-yellow-500/10 text-yellow-500' },
      failed: { text: 'Failed', className: 'bg-red-500/10 text-red-500' },
      error: { text: 'Failed', className: 'bg-red-500/10 text-red-500' },
      default: { text: status, className: 'bg-gray-500/10 text-gray-500' },
    };

    const { text, className } = statusMap[status.toLowerCase()] || statusMap.default;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {text}
      </span>
    );
  }

  // Get transaction type icon based on type
  const getTransactionTypeIcon = (type: string) => {
    if (type === 'deposit') {
      return <ArrowDownLeft className="w-5 h-5 text-orange-500 group-hover:animate-bounce" />;
    } else if (type === 'withdrawal') {
      return <ArrowUpRight className="w-5 h-5 text-gray-300 group-hover:animate-pulse" />;
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full min-h-screen bg-gradient-to-br  ${theme.colors.text} font-sans relative overflow-hidden`}>
      {/* Background gradient effects */}
      <div className="absolute top-20 -left-10 w-40 h-40 bg-orange-700/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-purple-700/10 rounded-full blur-3xl animate-pulse-slow"></div>
     <div className=" shadow-md rounded-2xl  w-full overflow-hidden">
        {/* Header with title and controls */}
          <div className={`p-4 transition-all duration-500 backdrop-blur-sm shadow-xl relative overflow-hidden ${animateHeader ? 'animate-fadeIn' : 'opacity-0'}`} style={{animationDelay: '600ms'}}>
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-orange-500/10 rounded-full blur-xl animate-pulse-slow"></div>
            
            {/* Updated flex container */}
            <div className="flex justify-between items-center">
              {/* Left side - Title and refresh button */}
              <div className="flex gap-2 group">
                <Activity size={18} className="text-orange-500 opacity-0 group-hover:opacity-100 transition-all duration-500 -translate-x-4 group-hover:translate-x-0" />
                <h2 className="text-lg font-semibold group-hover:translate-x-1 transition-transform">
                  {t("History")}
                </h2>
                <RotateCw 
                  size={8} 
                  className="text-gray-400 cursor-pointer hover:text-gray-700 transition-colors hover:rotate-180 duration-500"
                  onClick={refreshTransactions}
                />
              </div>

              {/* Right side - View All button */}
              <Link href="/all_transactions" passHref>
                <button className="px-4 py-2  flex items-center gap-2">
                  {t("View All")}
                </button>
              </Link>

              {/* <div className="hidden md:flex gap-4 text-sm mt-4 md:mt-0 md:ml-8">
                <button
                  className={`${activeTab === 'all' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
                  onClick={() => setActiveTab('all')}
                >
                  {t("See All ")}
                  <span className="text-xs text-gray-500">.</span>
                </button>
                <button
                  className={`${activeTab === 'deposits' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
                  onClick={() => handleTabChange('deposits')}
                >
                  {t("See Deposits ")}
                  <span className="text-xs text-gray-500">.</span>
                </button>
                <button
                  className={`${activeTab === 'withdrawals' ? 'text-black dark:text-white' : 'text-gray-400'} hover:text-black dark:hover:text-white transition-colors flex items-center gap-1`}
                  onClick={() => handleTabChange('withdrawals')}
                >
                  {t("See Withdrawals")}
                  <span className="text-xs text-gray-500">.</span>
                </button>
              </div> */}
            </div>

        </div>

        {/* Transaction list */}
        <div className="space-y-3 pb-4">
              {loading && page === 1 ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4">
                  <div className="bg-gray-800/50 rounded-full p-4 mb-4">
                    <Activity className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No transactions found</h3>
                  <p className="text-sm text-gray-500 text-center">
                    {activeTab === 'all'
                      ? t("You haven't made any transactions yet.")
                      : activeTab === 'deposits'
                      ? t("No deposits have been made yet.")
                      : t("No withdrawals have been made yet.")}
                  </p>
                </div>
            ) : (
              transactions.map((item, index) => (
                <div
                  key={item.id}
                  className={`rounded-lg p-3 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-orange-900/10 group animate-fadeIn bg-gradient-to-br ${theme.colors.c_background} ${theme.colors.hover} ${
                    isNewTransaction[getTransactionKey(item)] ? 'animate-highlight' : ''
                  }`}
                  onClick={() => openTransactionDetails(item)}
                  style={{ animationDelay: `${(index + 1) * 150}ms` }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        item.transaction.type_trans === 'deposit'
                          ? 'bg-orange-500/20 text-orange-500'
                          : 'bg-gray-700/50 text-gray-300'
                        } relative overflow-hidden group-hover:scale-110 transition-transform`}>
                        {getTransactionTypeIcon(item.transaction.type_trans)}
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                      </div>
                      <div className="ml-3 group-hover:translate-x-1 transition-transform">
                        <div className="flex items-center">
                          <span className="font-medium dark:text-white">
                            {item.transaction.type_trans === 'deposit' ? 'Deposit' : 'Withdrawal'}
                          </span>
                          <span className={`text-xs ml-2 px-2 py-0.5 rounded-full whitespace-nowrap ${getStatusBadgeClass(item.transaction.status)} group-hover:scale-110 transition-transform relative`}>
                            <StatusBadge status={item.transaction.status} />
                            <span className={`absolute -bottom-1 left-0 h-0.5 w-0 ${
                              item.transaction.status.toLowerCase() === 'pending'
                                ? 'bg-amber-500'
                                : item.transaction.status.toLowerCase() === 'completed' || item.transaction.status.toLowerCase() === 'success' || item.transaction.status.toLowerCase() === 'accept'
                                  ? 'bg-green-500'
                                  : 'bg-red-500'
                            } group-hover:w-full transition-all duration-300`}></span>
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {item.transaction.phone_number}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(item.transaction.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        item.transaction.type_trans === 'deposit'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {formatAmount(item.transaction.amount)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-orange-400 transition-colors">
                        Ref: {item.transaction.reference.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}

              {/* Link to All Transactions Page */}
              {/* {!loading && transactions.length > 0 && ( // Only show link if there are transactions
                <div className="flex justify-center mt-4">
                  <Link href="/all_transactions" passHref>
                    <button
                      className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <MoreHorizontal size={16} />
                      {t("View All History")} 
                    </button>
                  </Link>
                </div>
              )} */}

              {/* Last updated info */}
              {/* {lastFetchTime && (
                <div className="text-xs text-center text-gray-500 mt-4">
                  {t("Last updated")}: {formatDate(lastFetchTime)}
                </div>
              )} */}
        </div>

        {/* WebSocket connection status */}
        {/* <div className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 rounded-full backdrop-blur-sm text-xs">
          <div className={`w-2 h-2 rounded-full ${
            wsStatus === 'connected' ? 'bg-green-500' :
            wsStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'
          } ${wsStatus === 'connected' ? 'animate-pulse' : ''}`}></div>
          <span className="text-gray-300">
            {wsStatus === 'connected' ? t('Live Updates') :
             wsStatus === 'error' ? t('Connection Error') : t('Connecting...')}
          </span>
          <button
            onClick={toggleRealTimeUpdates}
            className="ml-1"
            title={isRealTimeEnabled ? t('Disable live updates') : t('Enable live updates')}
          >
            {isRealTimeEnabled ?
              <Pause size={14} className="text-gray-400 hover:text-white transition-colors" /> :
              <Play size={14} className="text-gray-400 hover:text-white transition-colors" />
            }
          </button>
        </div> */}

        {/* Transaction detail modal */}
        {isModalOpen && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className={`bg-gradient-to-br ${theme.colors.c_background} rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scaleIn`}>
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Transaction type */}
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedTransaction.transaction.type_trans === 'deposit'
                      ? 'bg-orange-500/20 text-orange-500'
                      : 'bg-gray-700/50 text-gray-300'
                  }`}>
                    {getTransactionTypeIcon(selectedTransaction.transaction.type_trans)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">
                        {selectedTransaction.transaction.type_trans === 'deposit' ? 'Deposit' : 'Withdrawal'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full `}>
                        {selectedTransaction.transaction.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(selectedTransaction.transaction.created_at)}
                    </div>
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-gray-800/30 p-4 rounded-xl">
                  <div className="text-sm text-gray-500 mb-1">{t("Amount")}</div>
                  <div className={`text-2xl font-bold ${
                    selectedTransaction.transaction.type_trans === 'deposit'
                      ? 'text-orange-500'
                      : 'text-blue-500'
                  }`}>
                    {formatAmount(selectedTransaction.transaction.amount)}
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-3">
                  {/* Transaction ID */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t("Transaction ID")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{selectedTransaction.transaction.id}</span>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.transaction.id.toString())}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t("Reference")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{selectedTransaction.transaction.reference}</span>
                      <button
                        onClick={() => copyToClipboard(selectedTransaction.transaction.reference)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t("Phone Number")}</span>
                    <span className="text-sm">{selectedTransaction.transaction.phone_number}</span>
                  </div>

                  {/* Network */}
                  {selectedTransaction.transaction.network && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{t("Network")}</span>
                      <span className="text-sm">{selectedTransaction.transaction.network.public_name || selectedTransaction.transaction.network.name}</span>
                    </div>
                  )}

                  {/* Status */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{t("Status")}</span>
                    <span className={`text-sm font-medium `}>
                      <StatusBadge status={selectedTransaction.transaction.status} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {t("Close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

