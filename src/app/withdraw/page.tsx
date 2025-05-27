// pages/withdraw.js


'use client';
import { useState, useEffect } from 'react';
//import Head from 'next/head';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
// import styles from '../styles/Withdraw.module.css';
//import DashboardHeader from '@/components/DashboardHeader';
import { useTheme } from '../../components/ThemeProvider';


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

// Updated IdLink interface to match the structure from deposit/page.tsx
interface IdLink {
  id: string;
  user: string;
  link: string; // This is the saved bet ID
  app_name: App; // This should be the full App object
}

interface Transaction {
  id: string;
  amount?: number;
  type_trans: string;
  status: string;
  reference: string;
  created_at: string;
  network?: Network;
  app?: App;
  phone_number?: string;
  user_app_id?: string;
  error_message?: string;
  withdriwal_code?: string;
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

export default function Withdraw() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'selectId' | 'selectNetwork' | 'enterDetails'>('selectId');
  const [selectedId, setSelectedId] = useState<IdLink | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<{ id: string; name: string; image?: string } | null>(null);
  const [formData, setFormData] = useState({
    withdrawalCode: '',
    phoneNumber: ''
  });
  
  const [networks, setNetworks] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [savedAppIds, setSavedAppIds] = useState<IdLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const { theme } = useTheme();

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

  const handleNetworkSelect = (network: { id: string; name: string; image?: string }) => {
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
        type_trans: 'withdrawal',
        withdrawal_code: formData.withdrawalCode,
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
      
      setSuccess('Withdrawal initiated successfully!');
      // Reset form
      setCurrentStep('selectId');
      setSelectedId(null);
      setSelectedNetwork(null);
      setFormData({ withdrawalCode: '', phoneNumber: '' });
    } catch (err) {
      console.error('Withdrawal error:', err);
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.detail || 'Failed to process withdrawal');
      } else if (err instanceof Error) {
        setError(err.message || 'Failed to process withdrawal');
      } else {
        setError('Failed to process withdrawal');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'selectId':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Step 1: Select Your Bet ID</h2>
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
            <h2 className="text-xl font-bold">Step 2: Select Network</h2>
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
                    <img src={network.image} alt={network.name} className="h-12 mx-auto mb-2" />
                  ) : (
                    <div className="h-12 flex items-center justify-center mb-2">
                      {network.name}
                    </div>
                  )}
                  <div className="text-sm font-medium">{network.name}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentStep('selectId')}
              className="mt-4 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to Bet IDs
            </button>
          </div>
        );
        
      case 'enterDetails':
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Step 3: Enter Withdrawal Details</h2>
            
            <div className=" p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Selected Bet ID</p>
                  <p className="font-medium">{selectedId?.link}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Network</p>
                  <p className="font-medium">{selectedNetwork?.name}</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="withdrawalCode" className="block text-sm font-medium mb-1">
                    Withdrawal Code
                  </label>
                  <input
                    type="text"
                    id="withdrawalCode"
                    name="withdrawalCode"
                    value={formData.withdrawalCode}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    placeholder="Enter your withdrawal code"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">
                    Phone Number
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
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Submit'}
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
      <h1 className="text-2xl font-bold mb-6">Withdraw Funds</h1>

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
            case 'selectId': stepName = 'Select Bet ID'; break;
            case 'selectNetwork': stepName = 'Select Network'; break;
            case 'enterDetails': stepName = 'Enter Details'; break;
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`${theme.colors.background} rounded-lg shadow-xl w-full max-w-md`}>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Status:</span> {selectedTransaction.transaction.status}</p>
                <p><span className="font-medium">Reference:</span> {selectedTransaction.transaction.reference}</p>
                <p><span className="font-medium">Date:</span> {new Date(selectedTransaction.transaction.created_at).toLocaleString()}</p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    
  
      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}