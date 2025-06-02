'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardHeader from '@/components/DashboardHeader';
import { useTheme } from '@/components/ThemeProvider';
import { CopyIcon } from 'lucide-react';
// import axios from 'axios';

const BASE_URL = 'https://api.yapson.net';

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

interface IdLink {
  id: string;
  user: string;
  link: string;
  app_name: App;
}

export default function BetIdsPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  
  const [savedAppIds, setSavedAppIds] = useState<IdLink[]>([]);
  const [newAppId, setNewAppId] = useState('');
  const [selectedApp, setSelectedApp] = useState('');
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's saved bet IDs
  const fetchBetIds = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error("Access token not found for fetching saved app IDs.");
      setSavedAppIds([]);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/yapson/id_link`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });

      if (response.ok) {
        const data = await response.json();
        let processedData: IdLink[] = [];
        
        if (Array.isArray(data)) {
          processedData = data;
        } else if (data && Array.isArray(data.results)) {
          processedData = data.results;
        } else if (data && Array.isArray(data.data)) {
          processedData = data.data;
        } else if (data && data.id && data.link && data.app_name) {
          processedData = [data];
        }
        
        setSavedAppIds(processedData);
      } else {
        console.error('Failed to fetch saved app IDs:', response.status);
        setSavedAppIds([]);
      }
    } catch (error) {
      console.error('Error fetching bet IDs:', error);
      setSavedAppIds([]);
    }
  };

  // Fetch available apps
  const fetchApps = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${BASE_URL}/yapson/app_name`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setApps(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch apps:', response.status);
        setApps([]);
      }
    } catch (error) {
      console.error('Error fetching apps:', error);
      setApps([]);
    }
  };

  // Add new bet ID
  const handleAddBetId = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedApp || !newAppId.trim()) {
      console.log(t('Please select an app and enter a bet ID.'));
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log(t('You must be logged in to add a bet ID.'));
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/yapson/id_link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          link: newAppId.trim(),
          app_name_id: selectedApp
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('Failed to add bet ID'));
      }

      console.log(t('Bet ID added successfully!'));
      setNewAppId('');
      setSelectedApp('');
      await fetchBetIds();
    } catch (error: any) {
      console.error('Error adding bet ID:', error);
      console.log(error.message || t('Failed to add bet ID'));
    }
  };

  // Delete bet ID
  const handleDeleteBetId = async (id: string) => {
    if (!confirm(t('Are you sure you want to delete this bet ID?'))) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log(t('You must be logged in to delete a bet ID.'));
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/yapson/id_link/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(t('Failed to delete bet ID'));
      }

      console.log(t('Bet ID deleted successfully!'));
      setSavedAppIds(prev => prev.filter(item => item.id !== id));
    } catch (error: any) {
      console.error('Error deleting bet ID:', error);
      console.log(error.message || t('Failed to delete bet ID'));
    }
  };

  // Initial data fetch
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchApps(), fetchBetIds()]);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    init();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme.colors.background} ${theme.colors.text}`}>
      <DashboardHeader />
      <button
            onClick={() => window.history.back()}
            className="flex items-center text-md font-medium  dark:text-gray-300 dark:hover:text-white  px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t("Back")}
          </button>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className={`bg-gradient-to-br ${theme.colors.a_background} rounded-xl shadow-sm p-6 mb-8`}>
          <div className="flex items-center mb-6">
            <div className={`p-3 bg-gradient-to-br ${theme.colors.a_background} rounded-full mr-4`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M 9 12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold">{t("Betting App IDs")}</h2>
          </div>

          {/* Add new Bet ID */}
          <div className={`bg-gradient-to-br ${theme.colors.c_background} p-4 rounded-lg mb-6`}>
            <h3 className="font-semibold mb-4">{t("Add New Bet ID")}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">{t("App Name")}</label>
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">{t("Select App")}</option>
                  {apps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.public_name || app.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t("User Bet ID")}</label>
                <input
                  type="text"
                  value={newAppId}
                  onChange={(e) => setNewAppId(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder={t("Enter your bet ID")}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddBetId}
                  className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-all duration-200"
                >
                  {t("Add Bet ID")}
                </button>
              </div>
            </div>
          </div>

          {/* Saved Bet IDs */}
          <div className={`bg-gradient-to-br ${theme.colors.c_background} p-4 rounded-lg`}>
            <h3 className="font-semibold mb-4">{t("Saved Bet IDs")}</h3>
            {!savedAppIds || savedAppIds.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t("No bet IDs saved yet")}</p>
            ) : (
              <div className="space-y-3">
                {savedAppIds.map((item) => {
                  const appName = item.app_name?.public_name || item.app_name?.name || 'Unknown App';
                  return (
                    <div key={item.id} className={`${theme.colors.background} flex items-center justify-between p-3 rounded-lg`}>
                      <div className="flex items-center">
                        <span className="font-medium">{appName}</span>
                        <span className="ml-2">- {item.link}</span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigator.clipboard.writeText(item.link);
                            // alert(t('Bet ID copied to clipboard'));
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <CopyIcon className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                      <button
                        onClick={() => handleDeleteBetId(item.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title={t('Delete')}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}