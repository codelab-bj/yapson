

// 'use client';
// import { useState, useEffect } from 'react';
// import Head from 'next/head';
// import axios, { AxiosError } from 'axios';
// import { useTranslation } from 'react-i18next';
// //import styles from '../styles/Deposits.module.css';
// import { ClipboardIcon } from 'lucide-react'; // Make sure to install this package
// //import { Transaction } from 'mongodb';
// import DashboardHeader from '@/components/DashboardHeader';
// import { useTheme } from '@/components/ThemeProvider';

// //import { Transaction } from 'mongodb';

// interface Network {
//   id: string;
//   name: string;
//   public_name?: string;
//   image?: string;
// }

// interface App {
//   id: string;
//   name: string;
//   public_name?: string;
//   image?: string;
// }

// // Updated IdLink interface to match the structure from profile/page.tsx
// interface IdLink {
//   id: string;
//   user: string;
//   link: string; // This is the saved bet ID
//   app_name: App; // This should be the full App object
// }

// interface Transaction {
//   id: string;
//   amount: number;
//   type_trans: string;
//   status: string;
//   reference: string;
//   created_at: string;
//   network?: Network;
//   app?: App;
//   phone_number?: string;
//   user_app_id?: string;
//   error_message?: string;
// }

// interface TransactionDetail {
//   transaction: Transaction;
// }

// interface ErrorResponse {
  
//   data?: {
//     [key: string]: string[] | string | undefined;
//     detail?: string;
//     message?: string;
//   };
//   status?: number;
// }
// export default function Deposits() {
//   const { t } = useTranslation();

//   const [formData, setFormData] = useState({
//     id: '',
//     amount: '',
//     number: '',
//     network: ''
//   });

//   const [networks, setNetworks] = useState<{ id: string; name: string; image?: string }[]>([]);
//   const [apps, setApps] = useState<{ id: string; name: string }[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [success, setSuccess] = useState('');
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
//   const { theme } = useTheme();

//   const [savedAppIds, setSavedAppIds] = useState<IdLink[]>([]); // Use the updated IdLink interface
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [filteredSuggestions, setFilteredSuggestions] = useState<IdLink[]>([]);
//    const [selectedSavedIdLink, setSelectedSavedIdLink] = useState<IdLink | null>(null);

// //const MINIMUM_DEPOSIT = 200.01; // Minimum deposit amount

//   // Fetch networks and apps data on component mount
//   useEffect(() => {
//     const fetchData = async () => {
//       const token = localStorage.getItem('accessToken'); // Retrieve the token from localStorage
//       if (!token) {
//         setError(t('You must be logged in to access this feature.'));
//         setLoading(false);
//         window.location.href = '/'; // Redirect to login page if token is not found
//         return;
//       }

//       try {
//         const networksResponse = await axios.get('https://api.yapson.net/yapson/network/', {
//           headers: {
//             Authorization: `Bearer ${token}` // Include the token in the headers
//           }
//         });
//         setNetworks(networksResponse.data);

//         // Fetch available apps (needed to link saved IDs to app details)
//         const appsResponse = await axios.get('https://api.yapson.net/yapson/app_name', {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setApps(appsResponse.data);


//         // Fetch saved app IDs
//         const savedIdsResponse = await axios.get('https://api.yapson.net/yapson/id_link', {
//          headers: {
//           Authorization: `Bearer ${token}`
//           }
//        });
//        // Assuming the API returns an array of IdLink objects directly or within a 'results'/'data' field
//        let processedData: IdLink[] = [];
//        if (Array.isArray(savedIdsResponse.data)) {
//          processedData = savedIdsResponse.data;
//        } else if (savedIdsResponse.data && Array.isArray(savedIdsResponse.data.results)) {
//          processedData = savedIdsResponse.data.results; // Handle paginated response
//        } else if (savedIdsResponse.data && Array.isArray(savedIdsResponse.data.data)) {
//          processedData = savedIdsResponse.data.data; // Handle other data structures
//        } else if (savedIdsResponse.data && typeof savedIdsResponse.data === 'object') {
//           // Handle case where a single object might be returned (less common for a list)
//           // Ensure it conforms to IdLink structure or skip
//           if (savedIdsResponse.data.id && savedIdsResponse.data.link && savedIdsResponse.data.app_name) {
//              processedData = [savedIdsResponse.data as IdLink];
//           }
//        }
//        setSavedAppIds(processedData);


//       } catch (err: unknown) { // Use unknown for caught errors
//         console.error(t('Error fetching data:'), err);
//         if (err instanceof Error) { // Type guard
//            setError(err.message || t('Failed to load necessary data. Please try again later.'));
//         } else {
//            setError(t('Failed to load necessary data. Please try again later.'));
//         }
//       }finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [t]);

//   //       const appsResponse = await axios.get('https://api.yapson.net/yapson/app_name', {
//   //         headers: {
//   //           Authorization: `Bearer ${token}` // Include the token in the headers
//   //         }
//   //       });
//   //       setApps(appsResponse.data);
//   //       // Fetch saved app IDs
//   //       const savedIdsResponse = await axios.get('https://api.yapson.net/yapson/id_link', {
//   //        headers: {
//   //         Authorization: `Bearer ${token}`
//   //         }
//   //      });
//   //      setSavedAppIds(savedIdsResponse.data);
//   //     } catch (err) {
//   //       console.error(t('Error fetching data:'), err);
//   //       setError(t('Failed to load necessary data. Please try again later.'));
//   //     }
//   //   };

//   //   fetchData();
//   // }, [t]);

//   // Filter suggestions based on input value
//   useEffect(() => {
//     if (formData.id) {
//       const filtered = savedAppIds.filter(item =>
//         item.link.toLowerCase().includes(formData.id.toLowerCase()) ||
//         item.app_name?.name?.toLowerCase().includes(formData.id.toLowerCase()) ||
//         item.app_name?.public_name?.toLowerCase().includes(formData.id.toLowerCase())
//       );
//       setFilteredSuggestions(filtered);
//     } else {
//       setFilteredSuggestions(savedAppIds); // Show all saved IDs when input is empty
//     }
//   }, [formData.id, savedAppIds]);



//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const { name, value } = e.target;
//     setFormData(prevState => ({
//       ...prevState,
//       [name]: value
//     }));
//     setSelectedSavedIdLink(null);
//     // Suggestions will be filtered by the useEffect hook
//   };

//   const handleNetworkSelect = (networkName: string) => {
//     setFormData(prevState => ({
//       ...prevState,
//       network: networkName
//     }));
//   };

//    // Handler for selecting a suggestion
//   const handleSelectSuggestion = (item: IdLink) => {
//     setFormData(prev => ({ ...prev, id: item.link })); // Set the input value to the saved link
//     setSelectedSavedIdLink(item); // Store the selected IdLink object
//     setShowSuggestions(false); // Hide suggestions
//   };

//   const formatDate = (dateString: string) => {
//     const date = new Date(dateString);
//     return date.toLocaleString();
//   };

//   // const getStatusClass = (status: string) => {
//   //   switch (status.toLowerCase()) {
//   //     case 'completed':
//   //     case 'success':
//   //       return 'text-green-600';
//   //     case 'pending':
//   //       return 'text-yellow-600';
//   //     case 'failed':
//   //     case 'error':
//   //       return 'text-red-600';
//   //     default:
//   //       return 'text-gray-600';
//   //   }
//   // };

//   const formatStatus = (status: string) => {
//     return status.charAt(0).toUpperCase() + status.slice(1);
//   };

//   const getTransactionTypeIcon = (type: string) => {
//     if (type === "deposit") {
//       return <span className="text-red-700">↓</span>;
//     } else {
//       return <span className="text-gray-700">↑</span>;
//     }
//   };

//   const closeTransactionDetails = () => {
//     setIsModalOpen(false);
//     setSelectedTransaction(null);
//   };

//   const showTransactionDetails = (transaction: Transaction) => {
//     setSelectedTransaction({ transaction });
//     setIsModalOpen(true);
//   };

//   const extractErrorMessage = (error: AxiosError<ErrorResponse>): string => {
//     // If the error response has data with field-specific errors
//     if (error.response && error.response.data) {
//       const data = error.response.data as unknown as Record<string, unknown>;
      
//       // Check if the error is in the format { "amount": ["Minimum deposit is 200.00 F CFA"] }
//       for (const field in data) {
//         if (Array.isArray(data[field]) && data[field].length > 0) {
//           return data[field][0];
//         }
//       }
      
//       // Check if there's a general error message
//       if ('detail' in data && typeof data.detail === 'string') {
//         return data.detail;
//       }
      
//       // Check if there's a general error message as string
//       if (typeof data === 'string') {
//         return data;
//       }
      
//       // Handle the case when there's a message about waiting between transactions
//       if ('message' in data && typeof data.message === 'string' && data.message.includes('wait')) {
//         return data.message;
//       }
//     }
    
//     // Default error message
//     return t('An error occurred. Please try again later.');
//   };  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//     e.preventDefault();
//     setLoading(true);
//     setError('');
//     setSuccess('');

//     const token = localStorage.getItem('accessToken'); // Retrieve the token from localStorage
//     if (!token) {
//       setError(t('You must be logged in to access this feature.'));
//       setLoading(false);
//       return;
//     }

//     if (!formData.network) {
//       setError(t('Please select a network'));
//       setLoading(false);
//       return;
//     }

//     if (!formData.id) {
//        setError(t('Please enter or select a Bet ID'));
//        setLoading(false);
//        return;
//     }









'use client';
import { useState, useEffect } from 'react';
//import Head from 'next/head';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
//import styles from '../styles/Deposits.module.css';
//import { ClipboardIcon } from 'lucide-react'; // Make sure to install this package
//import { Transaction } from 'mongodb';
//import DashboardHeader from '@/components/DashboardHeader';
import { useTheme } from '@/components/ThemeProvider';
import { useWebSocket } from '@/context/WebSocketContext';

//import { Transaction } from 'mongodb';

interface Network {
  id: string;
  name: string;
  public_name?: string;
  image?: string;
}

interface App {
  id: string;
  name: string;
  public_name?: string;
  image?: string;
  // Add other properties from the profile page App interface if needed for consistency
  is_active?: boolean;
  hash?: string;
  cashdeskid?: string;
  cashierpass?: string;
  order?: string | null;
  city?: string;
  street?: string;
  deposit_tuto_content?: string;
  deposit_link?: string;
  withdrawal_tuto_content?: string;
  withdrawal_link?: string;
}

// Updated IdLink interface to match the structure from profile/page.tsx
interface IdLink {
  id: string;
  user: string;
  link: string; // This is the saved bet ID
  app_name: App; // This should be the full App object
}

interface WebSocketMessage {
  type: string;
  data?: string;
}

interface Transaction {
  id: string;
  amount: number;
  type_trans: string;
  status: string;
  reference: string;
  created_at: string;
  network?: Network;
  app?: App;
  phone_number?: string;
  user_app_id?: string;
  error_message?: string;
}

interface TransactionDetail {
  transaction: Transaction;
}

// interface ErrorResponse {

//   data?: {
//     [key: string]: string[] | string | undefined;
//     detail?: string;
//     message?: string;
//   };
//   status?: number;
// }
export default function Deposits() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'selectId' | 'selectNetwork' | 'enterDetails'>('selectId');
  const [selectedId, setSelectedId] = useState<IdLink | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<{ id: string; name: string; public_name: string; image?: string } | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: ''
  });
  
  const [networks, setNetworks] = useState<{ id: string; name: string; public_name: string; image?: string }[]>([]);
  const [savedAppIds, setSavedAppIds] = useState<IdLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const { theme } = useTheme();
  const { addMessageHandler } = useWebSocket();


  useEffect(() => {
    const handleTransactionLink = (data: WebSocketMessage) => {
      if (data.type === 'transaction_link' && data.data) {
        console.log('Opening transaction link:', data.data);
        // Try to open in a new tab
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.location.href = data.data;
      } else {
        // Fallback to direct open if popup is blocked
        window.open(data.data, '_blank', 'noopener,noreferrer');
      }
    }
  };


    const removeHandler = addMessageHandler(handleTransactionLink);
    return () => removeHandler();
  }, [addMessageHandler]);


  // Fetch networks and saved app IDs on component mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError(t('You must be logged in to access this feature.'));
        setLoading(false);
        window.location.href = '/';
        return;
      }

      try {
        // Fetch networks
        const networksResponse = await axios.get('https://api.yapson.net/yapson/network/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNetworks(networksResponse.data);

        // Fetch saved app IDs
        const savedIdsResponse = await axios.get('https://api.yapson.net/yapson/id_link', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let processedData: IdLink[] = [];
        if (Array.isArray(savedIdsResponse.data)) {
          processedData = savedIdsResponse.data;
        } else if (savedIdsResponse.data?.results) {
          processedData = savedIdsResponse.data.results;
        } else if (savedIdsResponse.data?.data) {
          processedData = savedIdsResponse.data.data;
        }
        
        setSavedAppIds(processedData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('Failed to load data. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleIdSelect = (idLink: IdLink) => {
    setSelectedId(idLink);
    setCurrentStep('selectNetwork');
  };

  const handleNetworkSelect = (network: { id: string; name: string; public_name: string; image?: string }) => {
    setSelectedNetwork(network);
    setCurrentStep('enterDetails');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !selectedNetwork) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post('https://api.yapson.net/yapson/transaction', {
        type_trans: 'deposit',
        amount: formData.amount,
        phone_number: formData.phoneNumber,
        network_id: selectedNetwork.id,
        app_id: selectedId.app_name?.id,
        user_app_id: selectedId.link
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const transaction = response.data;
      setSelectedTransaction({ transaction });
      setIsModalOpen(true);
      
      setSuccess('Transaction initiated successfully!');
      // Reset form
      setCurrentStep('selectId');
      setSelectedId(null);
      setSelectedNetwork(null);
      setFormData({ amount: '', phoneNumber: '' });
    } catch (err) {
      console.error('Transaction error:', err);
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object'
      ) {
        const response = (err as { response?: { data?: { detail?: string } } }).response;
        setError(response?.data?.detail || 'Failed to process transaction');
      } else {
        setError('Failed to process transaction');
      }
    } finally {
      setLoading(false);
    }
  };

  const closeTransactionDetails = () => {
  setIsModalOpen(false);
  setSelectedTransaction(null);
};

  const renderStep = () => {
    switch (currentStep) {
      case 'selectId':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("Step 1: Select Your Bet ID")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedAppIds.map((idLink) => (
                <div 
                  key={idLink.id}
                  onClick={() => handleIdSelect(idLink)}
                  className={`p-4 border rounded-lg cursor-pointer ${theme.colors.hover} transition-colors`}
                >
                  <div className="font-medium">{idLink.app_name?.public_name || idLink.app_name?.name || 'Unknown App'}</div>
                  <div className="text-sm text-gray-500 truncate">{idLink.link}</div>
                </div>
              ))}
            </div>
            {savedAppIds.length === 0 && (
              <p className="text-gray-500">No saved bet IDs found. Please add one in your profile.</p>
            )}
          </div>
        );
        
      case 'selectNetwork':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("Step 2: Select Network")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {networks.map((network) => (
                <div
                  key={network.id}
                  onClick={() => handleNetworkSelect(network)}
                  className={`p-4 border rounded-lg cursor-pointer text-center ${
                    selectedNetwork?.id === network.id ? `border-orange-500 ${theme.colors.background}` : `${theme.colors.hover}`
                  } transition-colors`}
                >
                  {network.image ? (
                    <img src={network.image} alt={network.public_name} className="h-12 mx-auto mb-2" />
                  ) : (
                    <div className="h-12 flex items-center justify-center mb-2">
                      {network.public_name}
                    </div>
                  )}
                  <div className="text-sm font-medium">{network.public_name}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentStep('selectId')}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← {t("Back to Bet IDs")}
            </button>
          </div>
        );
        
      case 'enterDetails':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">{t("Step 3: Enter Details")}</h2>
            
            <div className={`${theme.colors.c_background} p-4 rounded-lg`}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">{t("Selected Bet ID")}</p>
                  <p className="font-medium">{selectedId?.link}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t("Network")}</p>
                  <p className="font-medium">{selectedNetwork?.public_name}</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium mb-1">
                    {t("Amount")} (FCFA)
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter amount"
                    required
                    min="200"
                    step="50"
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                    {t("Phone Number")}
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="e.g., 771234567"
                    required
                  />
                </div>
                
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('selectNetwork')}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    ← {t("Back")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? t('Processing...') : t('Submit')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t("Deposit Funds")}</h1>
      <button
            onClick={() => window.history.back()}
            className="flex items-center text-md font-medium  dark:text-gray-300 dark:hover:text-white  px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("Back")}
          </button>
      {/* Progress Steps */}
      <div className="flex justify-between mb-8 relative">
        {['selectId', 'selectNetwork', 'enterDetails'].map((step, index) => {
          const stepNum = index + 1;
          let stepName = '';
          const currentStepIndex = ['selectId', 'selectNetwork', 'enterDetails'].indexOf(currentStep);
          
          switch (step) {
            case 'selectId': stepName = t('Select Bet ID'); break;
            case 'selectNetwork': stepName = t('Select Network'); break;
            case 'enterDetails': stepName = t('Enter Details'); break;
          }
          
          const isCompleted = index < currentStepIndex;
          const isActive = index === currentStepIndex;
          
          return (
            <div key={step} className="flex flex-col items-center flex-1 relative">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  isActive 
                    ? 'bg-orange-600 text-white' 
                    : isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {isCompleted ? '✓' : stepNum}
              </div>
              <span className={`text-sm text-center ${isActive ? 'font-medium text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>
                {stepName}
              </span>
              
              {index < 2 && (
                <div className="absolute top-5 left-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10">
                  {isCompleted && (
                    <div className="h-full bg-green-500" style={{ width: '100%' }}></div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Main Content */}
      <div className={`bg-gradient-to-br ${theme.colors.a_background} rounded-lg shadow-md p-6`}>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {success}
          </div>
        )}
        
        {loading && !success && !error ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          renderStep()
        )}       
      </div>
      {/* Transaction Details Modal */}
        {isModalOpen && selectedTransaction && (
          <div className={`fixed inset-0 ${theme.colors.background}  flex items-center justify-center p-4 z-50`}>
            <div className={`bg-white rounded-lg shadow-xl w-full max-w-md`}>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{t("Transaction Details")}</h3>
                  <button 
                    onClick={closeTransactionDetails}
                    className=""
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t("Amount")}</span>
                    <span className="font-medium">{selectedTransaction.transaction.amount} FCFA</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t("Status")}</span>
                    <span className={`font-medium ${
                      selectedTransaction.transaction.status === 'completed' 
                        ? 'text-green-600 dark:text-green-400'
                        : selectedTransaction.transaction.status === 'pending'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {selectedTransaction.transaction.status.charAt(0).toUpperCase() + 
                      selectedTransaction.transaction.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="">{t("Reference")}</span>
                    <span className="font-medium">{selectedTransaction.transaction.reference}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="">{t("Date")}</span>
                    <span className="font-medium">
                      {new Date(selectedTransaction.transaction.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {selectedTransaction.transaction.phone_number && (
                    <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                      <span className="">{t("Phone Number")}</span>
                      <span className="font-medium">{selectedTransaction.transaction.phone_number}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeTransactionDetails}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    {t("Close")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

      {/* Recent transactions section - This could be added if needed */}
      {/* <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('Recent Deposits')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('View your recent deposit transactions')}</p>
        </div> */}
        
        {/* <div className="p-6"> */}
          {/* Sample transactions - This would be populated from API data */}
          {/* <div className="space-y-4"> */}
            {/* Empty state */}
            {/* <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">{t('No recent deposits')}</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {t('Your recent deposit transactions will appear here once you make your first deposit.')}
              </p>
            </div>
          </div>
        </div>
      </div> */}

      {/* FAQ Section */}
      {/* <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('Frequently Asked Questions')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{t('Common questions about deposits')}</p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white">
                <span className="font-medium">{t('How long do deposits take to process?')}</span>
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-4 text-gray-600 dark:text-gray-300">
                <p>{t('Deposits are typically processed within 5-15 minutes. During high volume periods, it may take up to 30 minutes. If your deposit has not been processed within 1 hour, please contact customer support.')}</p>
              </div>
            </details>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white">
                <span className="font-medium">{t('What is the minimum deposit amount?')}</span>
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-4 text-gray-600 dark:text-gray-300">
                <p>{t('The minimum deposit amount is 500 XOF. There is no maximum limit for deposits.')}</p>
              </div>
            </details>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <details className="group">
              <summary className="flex justify-between items-center p-4 cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-white">
                <span className="font-medium">{t('Which payment methods are available?')}</span>
                <svg className="h-5 w-5 text-gray-500 dark:text-gray-400 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="p-4 text-gray-600 dark:text-gray-300">
                <p>{t('We currently support MTN Mobile Money and MOOV Money for deposits. Additional payment methods will be added in the future.')}</p>
              </div>
            </details>
          </div>
        </div>
      </div> */}

      {/* Support Section */}
      {/* <div className="mt-8 mb-12">
        <div className="bg-gradient-to-r from-orange-600 to-orange-600 rounded-2xl shadow-xl overflow-hidden">
          <div className="md:flex">
            <div className="p-6 md:p-8 md:w-3/5">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{t('Need help with your deposit?')}</h2>
              <p className="text-orange-100 mb-6">{t('Our support team is available 24/7 to assist you with any issues.')}</p>
              <div className="flex flex-wrap gap-4">
                <a href="#" className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>{t('Live Chat')}</span>
                </a>
                <a href="mailto:support@example.com" className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{t('Email Support')}</span>
                </a>
              </div>
            </div>
            <div className="hidden md:block md:w-2/5 relative">
              <div className="absolute inset-0 bg-orange-800/20 backdrop-blur-sm"></div>
              <div className="h-full flex items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> */}
//     </div>
//   );
// }