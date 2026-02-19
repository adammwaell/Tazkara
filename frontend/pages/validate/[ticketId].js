/**
 * Public Ticket Validation Page
 * Accessed via QR code scan - validates ticket at entry point
 */

import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ValidateTicket() {
  const router = useRouter();
  const { ticketId } = router.query;
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!ticketId) return;
    validateTicket();
  }, [ticketId]);

  const validateTicket = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(
        `${API}/tickets/validate`,
        { ticketCode: ticketId }
      );
      
      setResult(response.data);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.alreadyUsed) {
        setResult({ 
          success: false, 
          alreadyUsed: true,
          message: errorData.message,
          ticket: errorData.ticket
        });
      } else {
        setError(errorData?.message || 'Validation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'unused': return '#4ade80';
      case 'used': return '#f87171';
      case 'cancelled': return '#94a3b8';
      default: return '#94a3b8';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: '#0f0f1a' }}>
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <p className="text-white text-lg">Validating ticket...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0f0f1a' }}>
        <Head>
          <title>Invalid Ticket | AdamTickets</title>
        </Head>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <span className="text-5xl">❌</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Invalid Ticket</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Already used ticket
  if (result?.alreadyUsed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0f0f1a' }}>
        <Head>
          <title>Already Scanned | AdamTickets</title>
        </Head>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center"
        >
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
            <span className="text-5xl">⛔</span>
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Already Scanned</h1>
          <p className="text-gray-400 mb-6">This ticket has already been scanned.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // Valid ticket
  if (result?.validated) {
    const ticket = result.ticket;
    return (
      <div className="min-h-screen flex flex-col items-center p-4" style={{ background: '#0f0f1a' }}>
        <Head>
          <title>Valid Ticket | AdamTickets</title>
        </Head>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full"
        >
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
              <span className="text-5xl">✅</span>
            </div>
            <h1 className="text-3xl font-bold text-green-400 mb-2">VALID TICKET</h1>
            <p className="text-gray-400">Entry approved</p>
          </div>

          {/* Ticket Details Card */}
          <div className="rounded-2xl p-6" style={{ background: '#1a1a2e', border: '2px solid #22c55e' }}>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                <span className="text-gray-400">Ticket Code</span>
                <span className="text-white font-mono font-bold text-lg">{ticket.ticketCode}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Holder</span>
                <span className="text-white font-medium">{ticket.holderName}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Event</span>
                <span className="text-white">{ticket.eventId?.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white">
                  {ticket.eventId?.date ? new Date(ticket.eventId.date).toLocaleDateString('en-EG', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Venue</span>
                <span className="text-white">{ticket.eventId?.venue}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Seat Type</span>
                <span className="text-white capitalize">{ticket.seatType}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Wave</span>
                <span className="text-white">{ticket.orderId?.waveName || 'N/A'}</span>
              </div>

              <div className="flex justify-between pt-4 border-t border-gray-700">
                <span className="text-gray-400">Validated At</span>
                <span className="text-green-400">
                  {ticket.usedAt ? new Date(ticket.usedAt).toLocaleString('en-EG') : 'Just now'}
                </span>
              </div>
            </div>
          </div>

          {/* Back button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
