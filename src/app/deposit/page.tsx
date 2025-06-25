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
import { CopyIcon } from 'lucide-react';

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
  image: string;
  is_active: boolean;
  hash: string;
  cashdeskid: string;
  cashierpass: string;
  order: string | null;
  city: string;
  street: string;
  deposit_tuto_content: string;
  deposit_link: string;
  withdrawal_tuto_content: string;
  withdrawal_link: string;
  public_name: string;
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
  const [selectedPlatform, setSelectedPlatform] = useState<App | null>(null);
  const [platforms, setPlatforms] = useState<App[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<{ id: string; name: string; public_name: string; image?: string } | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: '',
    betid: '',
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
  const [pendingTransactionLink, setPendingTransactionLink] = useState<string | null>(null);

  useEffect(() => {
    const handleTransactionLink = (data: WebSocketMessage) => {
      if (data.type === 'transaction_link' && data.data) {
        setPendingTransactionLink(data.data); // Store the link, don't open immediately
      }
    };
    const removeHandler = addMessageHandler(handleTransactionLink);
    return () => removeHandler();
  }, [addMessageHandler]);

  const handleOpenTransactionLink = () => {
    if (pendingTransactionLink) {
      window.open(pendingTransactionLink, '_blank', 'noopener,noreferrer');
      setPendingTransactionLink(null);
    }
  };

  // Fetch networks and saved app IDs on component mount
  const fetchPlatforms = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch('https://api.yapson.net/yapson/app_name', {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlatforms(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch platforms:', response.status);
        setPlatforms([]);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
      setPlatforms([]);
    }
  };

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
        setLoading(true);
        // Fetch all data in parallel
        const [networksResponse, savedIdsResponse] = await Promise.all([
          fetch('https://api.yapson.net/yapson/network/', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('https://api.yapson.net/yapson/id_link', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetchPlatforms() // Fetch platforms in parallel
        ]);

        if (networksResponse.ok) {
          const networksData = await networksResponse.json();
          setNetworks(networksData);
        }

        if (savedIdsResponse.ok) {
          const data = await savedIdsResponse.json();
          let processedData: IdLink[] = [];
          
          if (Array.isArray(data)) {
            processedData = data;
          } else if (data?.results) {
            processedData = data.results;
          } else if (data?.data) {
            processedData = data.data;
          }
          
          setSavedAppIds(processedData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('Failed to load data. Please try again later.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handlePlatformSelect = (platform: App) => {
    setSelectedPlatform(platform);
    setCurrentStep('selectNetwork');
  };

  const handleNetworkSelect = (network: { id: string; name: string; public_name: string; image?: string }) => {
    setSelectedNetwork(network);
    setCurrentStep('enterDetails');
  };

   // Save new bet ID
   const saveBetId = async (betId: string) => {
    if (!selectedPlatform || !betId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch('https://api.yapson.net/yapson/id_link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          app_name: selectedPlatform.id,
          link: betId
        })
      });

      if (response.ok) {
        const newIdLink = await response.json();
        setSavedAppIds(prev => [...prev, newIdLink]);
      }
    } catch (error) {
      console.error('Error saving bet ID:', error);
    }
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
    if (!selectedPlatform || !selectedNetwork) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');
      
      const response = await axios.post('https://api.yapson.net/yapson/transaction', {
        type_trans: 'deposit',
        amount: formData.amount,
        phone_number: formData.phoneNumber,
        network_id: selectedNetwork.id,
        app_id: selectedPlatform.id,
        user_app_id: formData.betid
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const transaction = response.data;
      setSelectedTransaction({ transaction });
      setIsModalOpen(true);
      
      setSuccess('Transaction initiated successfully!');
      // Reset form
      setCurrentStep('selectId');
      setSelectedPlatform(null);
      setSelectedNetwork(null);
      setFormData({ amount: '', phoneNumber: '', betid: '' });
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

  /**
   * Renders the current step of the deposit process.
   *
   * @returns A JSX element representing the current step of the deposit process.
   */
const renderStep = () => {
  switch (currentStep) {
    case 'selectId':
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">{t("Step 1: Select Your Betting Platform")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <div 
                key={platform.id}
                onClick={() => handlePlatformSelect(platform)}
                className={`p-4 border rounded-lg cursor-pointer ${theme.colors.hover} transition-colors`}
              >
                <div className="font-medium">{platform.public_name || platform.name}</div>
                {platform.image && (
                  <img 
                    src={platform.image} 
                    alt={platform.public_name || platform.name}
                    className="h-10 w-10 object-contain mt-2"
                  />
                )}
              </div>
            ))}
          </div>
          {platforms.length === 0 && !loading && (
            <p className="text-gray-500">No betting platforms available.</p>
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
          const platformBetIds = savedAppIds.filter(id => id.app_name.id === selectedPlatform?.id);
          
          return (
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <button 
                  onClick={() => {
                    setSelectedNetwork(null);
                    setCurrentStep('selectNetwork');
                  }}
                  className="mr-2 text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <h2 className="text-xl font-bold">{t("Step 3: Enter Details")}</h2>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t("Bet ID")} ({selectedPlatform?.public_name || selectedPlatform?.name})
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.betid}
                      onChange={(e) => setFormData(prev => ({ ...prev, betid: e.target.value }))}
                      className="w-full p-2 border rounded"
                      placeholder={t("Enter your bet ID")}
                    />
                    {platformBetIds.length > 0 && (
                      <div className="mt-2">
                        <label className="block text-sm text-gray-500 mb-1">{t("Saved Bet IDs")}</label>
                        <div className="flex flex-wrap gap-2">
                          {platformBetIds.map((id) => (
                            <div
                            key={id.id}
                            className="px-3 py-1 bg-gray-100 rounded-full text-black text-sm hover:bg-gray-200 cursor-pointer flex items-center"
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({ ...prev, betid: id.link }));
                            }}
                          >
                            <span className="mr-2">{id.link}</span>
                            <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(id.link);
                                  // alert(t('Bet ID copied to clipboard'));
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                              >
                              <CopyIcon className="h-4 w-4 text-gray-500" />
                            </button>
                          </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
  
                <div>
                  <label className="block text-sm font-medium mb-1">{t("Amount")}</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder={t("Enter amount")}
                  />
                </div>
  
                <div>
                  <label className="block text-sm font-medium mb-1">{t("Phone Number")}</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full p-2 border rounded"
                    placeholder={t("Enter phone number")}
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

        {/* Pending Transaction Link Notification */}
        {pendingTransactionLink && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <div className="bg-white p-6 rounded shadow-lg">
              <p>Transaction terminée. Cliquez ci-dessous pour continuer :</p>
              <button
                onClick={handleOpenTransactionLink}
                className="mt-4 px-4 py-2 bg-orange-600 text-white rounded"
              >
                Transaction ouverte
              </button>
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