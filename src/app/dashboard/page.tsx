"use client"
import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import TransactionHistory from '@/components/TransactionHistory';
import { useTranslation } from 'react-i18next';
import Footer from '@/components/footer';
import Advertisement_Hero from '@/components/Advertisement_Hero';
import { ArrowDownLeft, ArrowUpRight, Ticket, CreditCard } from 'lucide-react';
import Image from 'next/image'

export default function Dashboard() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [animateHeader, setAnimateHeader] = useState(false);
  
  // Simulates loading state
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    // Trigger header animation
    setTimeout(() => {
      setAnimateHeader(true);
    }, 500);
  }, []);
 
  return (
   
    <div className="min-h-screen font-sans relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute top-20 -left-10 w-40 h-40 bg-orange-700/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-20 right-10 w-60 h-60 bg-purple-700/10 rounded-full blur-3xl animate-pulse-slow"></div>
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/90 z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 border-4 border-gray-700 border-t-orange-500 rounded-full animate-spin"></div>
            <p className="text-gray-400">Loading Yapson...</p>
          </div>
        </div>
      )}
      
      {/* Header */}
      <DashboardHeader />
       <Advertisement_Hero />
      {/* Main Content */}
      <main className="py-4 md:py-6 px-4 md:px-6">
        <h1 className={`text-xl md:text-2xl font-bold mb-4 md:mb-6 relative inline-block ${animateHeader ? 'animate-fadeIn' : 'opacity-0'}`}>
          {t("Welcome to Yapson")}
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 animate-widthExpand"></span>
        </h1>
        
        {/* Action Buttons */}
        
        <div className={`mb-6 md:mb-8 ${animateHeader ? 'animate-slideInRight' : 'opacity-0'}`} style={{animationDelay: '300ms'}}>
          {/* Mobile Layout (4 buttons in a row) */}
          <div className="flex gap-2 md:hidden">
            {/* Depot Button */}
            <a href="/deposit" className="group relative flex-1 flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-95">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-2 group-active:scale-90 transition-transform">
                <ArrowDownLeft size={18} className="text-white" />
              </div>
              <span className=" font-medium text-xs">{t("DEPOSIT")}</span>
            </a>
            {/* Retrait Button */}
            <a href="/withdraw" className="group relative flex-1 flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-95">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-2 group-active:scale-90 transition-transform">
                <ArrowUpRight size={18} className="text-white" />
              </div>
              <span className=" font-medium text-xs">{t("WITHDRAW")}</span>
            </a>
            {/* Coupon Button */}
            <a href="/coupon" className="group relative flex-1 flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-95">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-2 group-active:scale-90 transition-transform">
                <Ticket size={18} className="text-white" />
              </div>
              <span className=" font-medium text-xs">{t("COUPON")}</span>
            </a>
            {/* Mes ID Button */}
            <a href="/bet_id" className="group relative flex-1 flex flex-col items-center justify-center p-3 transition-all duration-300 active:scale-95">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center mb-2 group-active:scale-90 transition-transform">
                <CreditCard size={18} className="text-white" />
              </div>
              <span className=" font-medium text-xs">{t("MY ID")}</span>
            </a>
          </div>
          {/* Desktop Layout (Horizontal) */}
          <div className="hidden md:flex gap-4">
            <a className="group relative flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 w-40 overflow-hidden" href="/deposit">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-orange-500 to-orange-700 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              <span className="absolute -inset-px bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-30 group-hover:animate-pulse rounded-lg"></span>
              <span className="relative z-10 flex items-center gap-2">
                {t("DEPOSIT")}
                <ArrowDownLeft size={16} className="transition-transform group-hover:translate-y-1 group-hover:animate-bounce" />
              </span>
            </a>
            
            <a className="group relative flex-none flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 w-40 border border-gray-700 overflow-hidden" href='/withdraw'>
              <span className="absolute inset-0 w-0 h-full bg-orange-600/20 transition-all duration-300 group-hover:w-full"></span>
              <span className="relative z-10 flex items-center gap-2">
                {t("WITHDRAW")}
                <ArrowUpRight size={16} className="transition-transform group-hover:translate-y-1 group-hover:-translate-x-1 group-hover:animate-pulse" />
              </span>
            </a>
            <a className="group relative flex-none flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 w-40 border border-gray-700 overflow-hidden" href='/coupon'>
              <span className="absolute inset-0 w-0 h-full from-orange-400 to-orange-600 transition-all duration-300 group-hover:w-full"></span>
              <span className="relative z-10 flex items-center gap-2">
                {t("COUPON")}
                <Ticket size={16} className="transition-transform group-hover:rotate-12 group-hover:animate-pulse" />
              </span>
            </a>
            <a className="group relative flex-none flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 w-40 border border-gray-700 overflow-hidden" href='/bet_id'>
              <span className="absolute inset-0 w-0 h-full bg-orange-600/20 transition-all duration-300 group-hover:w-full"></span>
              <span className="relative z-10 flex items-center gap-2">
                {t("MY ID")}
                <CreditCard size={16} className="transition-transform group-hover:translate-x-1 group-hover:animate-pulse" />
              </span>
            </a>
          </div>
        </div>
        
        {/* Transaction History */}
        <TransactionHistory/>
        
        {/* WhatsApp Float Button - Positioned above Footer */}
        <div className="relative mb-4">
          <a 
            href="https://wa.me/message/25W53A4ZCBAGC1" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group fixed bottom-24 right-6 z-40 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-green-500 hover:bg-green-600 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95"
          >
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
            <div className="absolute inset-0 rounded-full bg-green-500 animate-pulse"></div>
            
            {/* WhatsApp Icon */}
            <Image src='/whatsapp.png' width="64" height="64" className="text-white relative z-10 md:w-10 md:h-10" alt='whatsapp' />
            
            
            {/* Tooltip */}
            <div className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              Contact us on WhatsApp
              <div className="absolute top-1/2 left-full transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
            </div>
          </a>
        </div>
        
        <Footer/>
        
      </main>
    </div>
  );
}