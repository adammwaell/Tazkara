/**
 * QR Scanner Page - Requires Authentication and Scanner Permission
 * Staff can scan tickets at venue entry points
 */

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function Scanner() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('tazkara_token');
    const userData = localStorage.getItem('tazkara_user');
    
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    
    // Check if user has scanner permission (admin always has access)
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'superadmin' && parsedUser.permissions?.canScan !== true) {
      toast.error('You do not have scanner access');
      router.push('/dashboard');
      return;
    }
    
    setUser(parsedUser);
    setLoading(false);
  }, [router]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setScanning(true);
      
      // Start scanning frames
      scanIntervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current) {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          const ctx = canvas.getContext('2d');
          
          if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Try to detect QR code using BarcodeDetector API (if available)
            if ('BarcodeDetector' in window) {
              const barcodeDetector = new BarcodeDetector({
                formats: ['qr_code']
              });
              barcodeDetector.detect(canvas)
                .then(barcodes => {
                  if (barcodes.length > 0) {
                    const qrValue = barcodes[0].rawValue;
                    handleQRCode(qrValue);
                  }
                })
                .catch(err => console.log('Detection error:', err));
            }
          }
        }
      }, 250);
      
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Could not access camera. Please use manual entry.');
    }
  };

  const stopScanning = () => {
    stopCamera();
    setScanning(false);
  };

  const handleQRCode = async (qrData) => {
    // Stop scanning when we get a result
    stopScanning();
    
    let ticketCode;
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrData);
      ticketCode = parsed.ticketCode;
    } catch {
      // If not JSON, assume it's the ticket code directly
      ticketCode = qrData;
    }
    
    // Also check if it's a URL like /validate/AT-xxx
    if (qrData.includes('/validate/')) {
      ticketCode = qrData.split('/validate/')[1];
    }
    
    if (!ticketCode) {
      toast.error('Invalid QR code');
      setScanning(false);
      startCamera();
      return;
    }
    
    await validateTicket(ticketCode);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }
    await validateTicket(manualCode.trim());
  };

  const validateTicket = async (code) => {
    setScanning(true);
    try {
      const token = localStorage.getItem('tazkara_token');
      const response = await axios.post(
        `${API}/tickets/validate`,
        { ticketCode: code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setLastResult({
        success: true,
        ticket: response.data.ticket,
        message: response.data.message
      });
      toast.success('✓ Ticket validated!');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Validation failed';
      setLastResult({
        success: false,
        message: errorMsg,
        ticket: err.response?.data?.ticket || null
      });
      toast.error(errorMsg);
    } finally {
      setScanning(false);
      setManualCode('');
    }
  };

  const resetScanner = () => {
    setLastResult(null);
    setManualCode('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <Head>
        <title>Scanner | AdamTickets</title>
      </Head>
      
      <Navbar />
      
      <main className="max-w-2xl mx-auto pt-24 px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">🎫 Ticket Scanner</h1>
          <p className="text-gray-400">Scan tickets at venue entry</p>
        </motion.div>

        {/* Camera View / Manual Entry */}
        {!lastResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Camera Preview */}
            <div className="relative rounded-2xl overflow-hidden" style={{ background: '#1a1a2e', border: '1px solid var(--border)' }}>
              {cameraActive ? (
                <>
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-64 object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-48 border-4 border-green-400 rounded-lg animate-pulse" />
                  </div>
                  <button
                    onClick={stopScanning}
                    className="absolute top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-lg font-medium"
                  >
                    Stop Camera
                  </button>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-gray-400 mb-6">Use camera to scan QR codes or enter code manually</p>
                  <button
                    onClick={startCamera}
                    className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-lg transition-colors"
                  >
                    Start Camera Scan
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">OR</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Manual Entry */}
            <form onSubmit={handleManualSubmit} className="flex gap-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter ticket code..."
                className="flex-1 px-4 py-3 rounded-xl bg-[#1a1a2e] border border-gray-700 text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={scanning}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
              >
                {scanning ? 'Validating...' : 'Validate'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Result Display */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {/* Result Card */}
              <div 
                className="rounded-2xl p-6"
                style={{ 
                  background: lastResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: `2px solid ${lastResult.success ? '#22c55e' : '#ef4444'}`
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{lastResult.success ? '✅' : '❌'}</span>
                  <div>
                    <h3 className="text-xl font-bold" style={{ color: lastResult.success ? '#22c55e' : '#ef4444' }}>
                      {lastResult.success ? 'VALID TICKET' : 'INVALID TICKET'}
                    </h3>
                    <p className="text-gray-400 text-sm">{lastResult.message}</p>
                  </div>
                </div>

                {lastResult.ticket && (
                  <div className="space-y-3 mt-4 pt-4 border-t border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ticket Code</span>
                      <span className="text-white font-mono font-bold">{lastResult.ticket.ticketCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Event</span>
                      <span className="text-white">{lastResult.ticket.eventId?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date</span>
                      <span className="text-white">
                        {lastResult.ticket.eventId?.date ? new Date(lastResult.ticket.eventId.date).toLocaleDateString('en-EG', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Venue</span>
                      <span className="text-white">{lastResult.ticket.eventId?.venue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Seat Type</span>
                      <span className="text-white capitalize">{lastResult.ticket.seatType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Holder</span>
                      <span className="text-white">{lastResult.ticket.holderName || lastResult.ticket.userId?.name}</span>
                    </div>
                    {lastResult.ticket.usedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Used At</span>
                        <span className="text-green-400">
                          {new Date(lastResult.ticket.usedAt).toLocaleString('en-EG')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={resetScanner}
                  className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Scan Next Ticket
                </button>
                {!cameraActive && (
                  <button
                    onClick={startCamera}
                    className="flex-1 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
                  >
                    Open Camera
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
