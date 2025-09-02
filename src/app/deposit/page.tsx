'use client';
import { useState, useEffect } from 'react';
import { Trash2, PlusCircle } from 'lucide-react';
//import Head from 'next/head';
import api from '../../../utils/api';
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
  minimun_deposit?: number;
  max_deposit?: number;
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

interface DepositNetwork {
  id: string;
  name: string;
  public_name: string;
  image?: string;
  otp_required?: boolean;
  info?: string;
  deposit_message?: string;
}

export default function Deposits() {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'selectId' | 'selectNetwork' | 'addBetId' | 'enterDetails'>('selectId');
  const [selectedPlatform, setSelectedPlatform] = useState<App | null>(null);
  const [platforms, setPlatforms] = useState<App[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<DepositNetwork | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    phoneNumber: '',
    betid: '',
    otp_code: '', // Added OTP code to form state
  });
  
  const [networks, setNetworks] = useState<DepositNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const { theme } = useTheme();
  const { addMessageHandler } = useWebSocket();
  const [pendingTransactionLink, setPendingTransactionLink] = useState<string | null>(null);
  const [savedAppIds, setSavedAppIds] = useState<{ id: string; user: string; link: string; app_name: App }[]>([]);
  const [depositMessage, setDepositMessage] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    type_trans: string;
    amount: string;
    phone_number: string;
    network_id: string;
    app_id: string;
    user_app_id: string;
  } | null>(null);

  useEffect(() => { setMounted(true); }, []);
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
    try {
      const response = await api.get('/yapson/app_name');
      setPlatforms(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      setPlatforms([]);
    }
  };

  // Fetch networks and saved app IDs on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch all data in parallel
        const [networksResponse, savedIdsResponse] = await Promise.all([
          api.get('/yapson/network/'),
          api.get('/yapson/id_link'),
          fetchPlatforms() // Fetch platforms in parallel
        ]);

        if (networksResponse.data) {
          setNetworks(networksResponse.data);
        }

        if (savedIdsResponse.data) {
          let processedData: { id: string; user: string; link: string; app_name: App }[] = [];
          if (Array.isArray(savedIdsResponse.data)) {
            processedData = savedIdsResponse.data;
          } else if (savedIdsResponse.data?.results) {
            processedData = savedIdsResponse.data.results;
          } else if (savedIdsResponse.data?.data) {
            processedData = savedIdsResponse.data.data;
          }
          setSavedAppIds(processedData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(t('Impossible de charger les données. Veuillez réessayer plus tard.'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Auto-hide error after 4 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (!mounted) return null;

  const handlePlatformSelect = (platform: App) => {
    setSelectedPlatform(platform);
    setCurrentStep('selectNetwork');
  };

  const handleNetworkSelect = (network: DepositNetwork) => {
    setSelectedNetwork(network);
    setDepositMessage(network.deposit_message || null);
    setCurrentStep('enterDetails');
  };

  // Delete Bet ID
  const handleDeleteBetId = async (betId: string) => {
    try {
      await api.delete(`/yapson/id_link/${betId}`);
      setSavedAppIds(prev => prev.filter(id => id.id !== betId));
    } catch (error) {
      console.error('Error deleting bet ID:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !selectedNetwork || !formData.betid) return;
    
    const payload = {
      type_trans: 'deposit',
      amount: formData.amount,
      phone_number: formData.phoneNumber.replace(/\s+/g, ''),
      network_id: selectedNetwork.id,
      app_id: selectedPlatform.id,
      user_app_id: formData.betid
    };

    // Show modal if deposit_message exists (regardless of deposit_api value)
    if (depositMessage) {
      setPendingPayload(payload);
      setShowDepositModal(true);
      return; // Don't submit yet, wait for user confirmation
    }

    // If deposit_api is not "connect" or deposit_message is null, submit directly
    await submitTransaction(payload);
  };

  const submitTransaction = async (payload: {
    type_trans: string;
    amount: string;
    phone_number: string;
    network_id: string;
    app_id: string;
    user_app_id: string;
  }) => {
    setLoading(true);
    try {
      const response = await api.post('/yapson/transaction', payload);

      const transaction = response.data;
      setSelectedTransaction({ transaction });
      setIsModalOpen(true);
      
      setSuccess('Transaction initiée avec succès!');
      // Reset form
      setCurrentStep('selectId');
      setSelectedPlatform(null);
      setSelectedNetwork(null);
      setFormData({ amount: '', phoneNumber: '', betid: '', otp_code: '' });
    } catch (err) {
      console.error('Transaction error:', err);
      // Enhanced error handling for backend field errors
      let errorMsg = 'Échec du traitement de la transaction';
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: unknown }).response === 'object'
      ) {
        const response = (err as { response?: { data?: Record<string, unknown> } }).response;
        const data = response?.data as Record<string, unknown> | undefined;
        if (data && typeof data === 'object') {
          // If data is an object with arrays of errors
          const messages: string[] = [];
          for (const key in data) {
            if (Array.isArray(data[key])) {
              messages.push(...(data[key] as string[]));
            } else if (typeof data[key] === 'string') {
              messages.push(data[key] as string);
            }
          }
          if (messages.length > 0) {
            errorMsg = messages.join(' ');
          } else if ('detail' in data && typeof data.detail === 'string') {
            errorMsg = data.detail;
          }
        } else if (data && 'detail' in data && typeof (data as { detail?: unknown }).detail === 'string') {
          errorMsg = (data as { detail?: string }).detail!;
        }
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDepositModalConfirm = async () => {
    setShowDepositModal(false);
    if (pendingPayload) {
      await submitTransaction(pendingPayload);
      setPendingPayload(null);
    }
  };

  const handleDepositModalCancel = () => {
    setShowDepositModal(false);
    setPendingPayload(null);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {platforms.map((platform) => (
              <div 
                key={platform.id}
                onClick={() => handlePlatformSelect(platform)}
                className={`p-4 border rounded-lg cursor-pointer text-center transition-colors shadow-md hover:shadow-xl
                  ${selectedPlatform?.id === platform.id ? `border-orange-500 ${theme.colors.background}` : `${theme.colors.hover} border-gray-200 dark:border-gray-700`}
                `}
              >
                <div className="flex flex-col items-center gap-2">
                  {platform.image ? (
                    <img 
                      src={platform.image} 
                      alt={platform.public_name || platform.name}
                      className="h-12 mx-auto mb-2 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-gray-500">{platform.public_name?.charAt(0) || platform.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="text-sm font-medium text-center">
                    {platform.public_name || platform.name}
                  </div>
                  {/* {platform.city && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {platform.city}
                    </div>
                  )} */}
                </div>
              </div>
            ))}
          </div>
          {platforms.length === 0 && !loading && (
            <p className="text-gray-500">Aucune plateforme de pari disponible.</p>
          )}
        </div>
      );
    case 'selectNetwork':
      return (
        <div className="space-y-4">
          {/* <h2 className="text-xl font-bold">{t("Step 2: Select Network")}</h2> */}
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
          <div className="flex flex-col md:flex-row md:justify-between mt-4 gap-2">
            <button
              onClick={() => setCurrentStep('selectId')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← {t("Retour aux Bet IDs")}
            </button>
            
          </div>
        </div>
      );
    case 'addBetId':
      // Only show Bet IDs for the selected platform
      const filteredBetIds = selectedPlatform
        ? savedAppIds.filter(id => id.app_name?.id === selectedPlatform.id)
        : [];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
              {t('Gestion des Bet IDs')}
            </h2>
            <button
              onClick={() => { window.location.href = '/bet_id'; }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg shadow hover:bg-orange-700 transition-all text-base font-medium"
            >
              <PlusCircle className="w-5 h-5" />
              {t('Ajouter un Bet ID')}
            </button>
          </div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-gray-600 dark:text-gray-200">{t('Vos Bet IDs enregistrés')}</h3>
            {!selectedPlatform ? (
              <div className="flex flex-col items-center justify-center py-8">
                <span className="text-4xl mb-2">🎲</span>
                <p className="text-gray-500 text-center text-base font-medium">{t('Veuillez d\'abord sélectionner une plateforme de pari.')}</p>
              </div>
            ) : filteredBetIds.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <span className="text-4xl mb-2">📭</span>
                <p className="text-gray-500 text-center text-base font-medium">{t('Aucun Bet ID trouvé pour cette plateforme. Veuillez en ajouter un pour continuer.')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-lg overflow-hidden">
                {filteredBetIds.map((id) => (
                  <li
                    key={id.id}
                    className={`flex items-center justify-between px-4 py-3 transition-all ${formData.betid === id.link ? 'border-l-4 border-orange-500' : `${theme.colors.hover} cursor-pointer`}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, betid: id.link }));
                      setCurrentStep('enterDetails');
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <span className={`font-mono text-base ${theme.colors.text}`}>{id.link}</span>
                      <span className="text-xs text-gray-500">{id.app_name?.public_name || id.app_name?.name}</span>
                    </div>
                    <button
                      className="ml-2 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-all"
                      onClick={e => {
                        e.stopPropagation();
                        handleDeleteBetId(id.id);
                        if (formData.betid === id.link) setFormData(prev => ({ ...prev, betid: '' }));
                      }}
                      title={t('Supprimer')}
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col md:flex-row md:justify-between gap-2 mt-6">
            <button
              onClick={() => setCurrentStep('selectId')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
            >
              ← {t('Retour')}
            </button>
          </div>
        </div>
      );
    case 'enterDetails':
      // Prevent access if no Bet ID is selected
      if (!formData.betid) {
        setCurrentStep('addBetId');
        return null;
      }
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('Bet ID sélectionné')}:</span>
            <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-mono text-base border border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900">
              {formData.betid}
            </span>
          </div>
          <div className="flex items-center mb-4">
            {/* <button 
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
            <h2 className="text-xl font-bold">{t("Step 3: Enter Details")}</h2> */}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("Montant")}</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder={t("Entrer le montant")}
                min={selectedPlatform?.minimun_deposit}
                max={selectedPlatform?.max_deposit}
              />
              {selectedPlatform && (
                <div className="mt-1 text-xs">
                  <span className={
                    formData.amount && Number(formData.amount) < Number(selectedPlatform.minimun_deposit)
                      ? 'text-red-600 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }>
                    {t('Dépôt minimum')}: {selectedPlatform.minimun_deposit} FCFA
                  </span>
                  <span className="mx-2 text-gray-400">|</span>
                  <span className={
                    formData.amount && Number(formData.amount) > Number(selectedPlatform.max_deposit)
                      ? 'text-red-600 font-semibold'
                      : 'text-gray-500 dark:text-gray-400'
                  }>
                    {t('Dépôt maximum')}: {selectedPlatform.max_deposit} FCFA
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("Numéro de téléphone")}</label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder={t("Entrer le numéro de téléphone")}
              />
            </div>
            {/* OTP input if required by network */}
            {selectedNetwork?.otp_required && (
              <div>
                <label className="block text-sm font-medium mb-1">{t("Code OTP")}</label>
                <input
                  type="text"
                  value={formData.otp_code}
                  onChange={e => setFormData(prev => ({ ...prev, otp_code: e.target.value }))}
                  required={selectedNetwork?.otp_required}
                  className="w-full p-2 border rounded"
                  placeholder={t("Entrer le code OTP")}
                />
                <p className="text-xs text-gray-500 mt-1">{selectedNetwork?.info || ""}</p>
              </div>
            )}
            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep('addBetId')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← {t("Retour")}
              </button>
              <button
                type="submit"
                disabled={loading || (selectedNetwork?.otp_required && !formData.otp_code)}
                className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? t('Traitement...') : t('Soumettre')}
              </button>
            </div>
          </form>
        </div>
      );
  }
};

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t("Déposer des fonds")}</h1>
      <button
            onClick={() => window.history.back()}
            className="flex items-center text-md font-medium  dark:text-gray-300 dark:hover:text-white  px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("Retour")}
          </button>
      {/* Progress Steps */}
      <div className="flex justify-between mb-8 relative">
        {['selectId', 'selectNetwork', 'addBetId', 'enterDetails'].map((step, index) => {
          const stepNum = index + 1;
          let stepName = '';
          const currentStepIndex = ['selectId', 'selectNetwork', 'addBetId', 'enterDetails'].indexOf(currentStep);
          
          switch (step) {
            case 'selectId': stepName = t('Sélectionnez une plateforme de paris'); break;
            case 'selectNetwork': stepName = t('Sélectionner le réseau'); break;
            case 'addBetId': stepName = t('Ajouter un Bet ID'); break;
            case 'enterDetails': stepName = t('Entrer les détails'); break;
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
              
              {index < 3 && (
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
      <div className={`bg-gradient-to-br ${theme.colors.c_background} rounded-lg shadow-md p-6`}>
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
                  <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">{t("Détails de la transaction")}</h3>
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
                    <span className="text-gray-600 dark:text-gray-400">{t("Montant")}</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">{selectedTransaction.transaction.amount} FCFA</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t("Statut")}</span>
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
                    <span className="text-gray-600 dark:text-gray-400">{t("Référence")}</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">{selectedTransaction.transaction.reference}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                    <span className="text-gray-600 dark:text-gray-400">{t("Date")}</span>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      {new Date(selectedTransaction.transaction.created_at).toLocaleString('fr-FR')}
                    </span>
                  </div>

                  {selectedTransaction.transaction.phone_number && (
                    <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">{t("Numéro de téléphone")}</span>
                      <span className="font-medium text-gray-600 dark:text-gray-400">{selectedTransaction.transaction.phone_number}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeTransactionDetails}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    {t("Fermer")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Message Modal */}
        {showDepositModal && depositMessage && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                  {t("Confirmation de dépôt")}
                </h3>
                <button 
                  onClick={handleDepositModalCancel}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                  {depositMessage}
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDepositModalCancel}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  {t("Annuler")}
                </button>
                <button
                  onClick={handleDepositModalConfirm}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                >
                  {t("OK")}
                </button>
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