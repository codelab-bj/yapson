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
  ussd_code?: string;
  message?: string;
  transaction_link?: string;
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

  // Last transaction summary state
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [isLastTransactionModalOpen, setIsLastTransactionModalOpen] = useState(false);
  const [lastTransactionLoading, setLastTransactionLoading] = useState(false);
  const [lastTransactionActionType, setLastTransactionActionType] = useState<'cancel' | 'finalize' | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Fetch last pending transaction on mount
  useEffect(() => {
    const fetchLastTransaction = async () => {
      try {
        const response = await api.get('/yapson/last-transaction');
        const lastTrans: Transaction = response.data;
        if (lastTrans && lastTrans.status === 'pending') {
          setLastTransaction(lastTrans);
          setIsLastTransactionModalOpen(true);
        }
      } catch {
        // Silent fail — no pending transaction or endpoint not available
      }
    };
    fetchLastTransaction();
  }, []);
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
      const response = await api.get('/yapson/app_name?filter_type=deposit');
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
          api.get('/yapson/network/?type=deposit'),
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

  const handleCancelLastTransaction = async () => {
    if (!lastTransaction?.reference) return;
    setLastTransactionActionType('cancel');
    setLastTransactionLoading(true);
    try {
      await api.post('/yapson/cancel-transaction', { reference: lastTransaction.reference });
      setLastTransaction(null);
      setIsLastTransactionModalOpen(false);
    } catch (err) {
      console.error('Error cancelling transaction:', err);
    } finally {
      setLastTransactionLoading(false);
      setLastTransactionActionType(null);
    }
  };

  const handleFinalizeLastTransaction = async () => {
    if (!lastTransaction?.reference) return;
    setLastTransactionActionType('finalize');
    setLastTransactionLoading(true);
    try {
      const response = await api.post('/yapson/finalize-transaction-user', { reference: lastTransaction.reference });
      const finalized: Transaction = response.data;
      setIsLastTransactionModalOpen(false);
      setLastTransaction(null);
      // Show the result in the existing transaction modal
      setSelectedTransaction({ transaction: finalized });
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error finalizing transaction:', err);
    } finally {
      setLastTransactionLoading(false);
      setLastTransactionActionType(null);
    }
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

        {/* Last Transaction Summary Modal */}
        {isLastTransactionModalOpen && lastTransaction && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-xl">⏳</span>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Transaction en attente
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsLastTransactionModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    disabled={lastTransactionLoading}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Vous avez une transaction en attente. Vous pouvez la finaliser ou l&apos;annuler.
                </p>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Type</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                      lastTransaction.type_trans === 'deposit'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                    }`}>
                      {lastTransaction.type_trans === 'deposit' ? 'Dépôt' : 'Retrait'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Statut</span>
                    <span className="font-semibold px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      En attente
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Référence</span>
                      <span className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all text-right max-w-[60%]">
                        {lastTransaction.reference}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Montant</span>
                    <span className="font-semibold text-gray-800 dark:text-white">
                      {lastTransaction.amount?.toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                  {lastTransaction.phone_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Téléphone</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">{lastTransaction.phone_number}</span>
                    </div>
                  )}
                  {lastTransaction.message && (
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded p-3 text-xs text-blue-700 dark:text-blue-300">
                      ℹ️ {lastTransaction.message}
                    </div>
                  )}
                  {lastTransaction.ussd_code && (
                    <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-3">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">Code USSD</p>
                      <p className="font-mono text-sm text-amber-700 dark:text-amber-300 break-all">{lastTransaction.ussd_code}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelLastTransaction}
                    disabled={lastTransactionLoading}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {lastTransactionLoading && lastTransactionActionType === 'cancel' ? 'Annulation...' : 'Annuler'}
                  </button>
                  <button
                    onClick={handleFinalizeLastTransaction}
                    disabled={lastTransactionLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {lastTransactionLoading && lastTransactionActionType === 'finalize' ? 'Finalisation...' : 'Finaliser'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
