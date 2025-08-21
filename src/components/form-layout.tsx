'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, WifiOff, Wifi, Clock } from "lucide-react";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface FormErrors {
  [key: string]: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'offline';
  message: string;
}

interface OfflineSubmission {
  id: string;
  data: FormData;
  timestamp: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export function FormLayout() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    state: '',
    postalCode: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSubmissions, setOfflineSubmissions] = useState<OfflineSubmission[]>([]);

  // Check online status and load offline submissions
  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      
      if (online && offlineSubmissions.length > 0) {
        // Try to sync offline submissions when back online
        syncOfflineSubmissions();
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Set initial status
    setIsOnline(navigator.onLine);
    
    // Load offline submissions from localStorage
    loadOfflineSubmissions();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOfflineSubmissions = () => {
    try {
      const stored = localStorage.getItem('offlineSubmissions');
      if (stored) {
        const submissions = JSON.parse(stored);
        setOfflineSubmissions(submissions);
      }
    } catch (error) {
      console.error('Error loading offline submissions:', error);
    }
  };

  const saveOfflineSubmissions = (submissions: OfflineSubmission[]) => {
    try {
      localStorage.setItem('offlineSubmissions', JSON.stringify(submissions));
    } catch (error) {
      console.error('Error saving offline submissions:', error);
    }
  };

  const addToast = (type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, message };
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const saveOfflineSubmission = (data: FormData): string => {
    const submission: OfflineSubmission = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      status: 'pending'
    };

    const updatedSubmissions = [...offlineSubmissions, submission];
    setOfflineSubmissions(updatedSubmissions);
    saveOfflineSubmissions(updatedSubmissions);
    
    return submission.id;
  };

  const syncOfflineSubmissions = async () => {
    const pendingSubmissions = offlineSubmissions.filter(s => s.status === 'pending');
    
    if (pendingSubmissions.length === 0) return;

    addToast('info', `Syncing ${pendingSubmissions.length} offline submission(s)...`);

    for (const submission of pendingSubmissions) {
      try {
        // Update status to syncing
        const updatedSubmissions = offlineSubmissions.map(s => 
          s.id === submission.id ? { ...s, status: 'syncing' as const } : s
        );
        setOfflineSubmissions(updatedSubmissions);
        saveOfflineSubmissions(updatedSubmissions);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Update status to synced
        const finalSubmissions = offlineSubmissions.map(s => 
          s.id === submission.id ? { ...s, status: 'synced' as const } : s
        );
        setOfflineSubmissions(finalSubmissions);
        saveOfflineSubmissions(finalSubmissions);

        addToast('success', `Offline submission synced successfully!`);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Update status to failed
        const failedSubmissions = offlineSubmissions.map(s => 
          s.id === submission.id ? { ...s, status: 'failed' as const } : s
        );
        setOfflineSubmissions(failedSubmissions);
        saveOfflineSubmissions(failedSubmissions);

        addToast('error', `Failed to sync offline submission`);
      }
    }

    // Remove synced submissions after a delay
    setTimeout(() => {
      const remainingSubmissions = offlineSubmissions.filter(s => s.status !== 'synced');
      setOfflineSubmissions(remainingSubmissions);
      saveOfflineSubmissions(remainingSubmissions);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      addToast('error', 'Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isOnline) {
        // Handle offline submission
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const submissionId = saveOfflineSubmission(formData);
        
        addToast('offline', 'Form saved offline! Will sync when connection returns.');
        
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          address: '',
          city: '',
          state: '',
          postalCode: ''
        });
        
        setIsSubmitting(false);
        return;
      }

      // Online submission
      addToast('info', 'Submitting form...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success/failure randomly for demo
      const isSuccess = Math.random() > 0.3; // 70% success rate
      
      if (isSuccess) {
        addToast('success', 'Form submitted successfully! Welcome to the workspace!');
        // Reset form on success
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          address: '',
          city: '',
          state: '',
          postalCode: ''
        });
      } else {
        addToast('error', 'Submission failed. Please try again.');
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      if (!isOnline) {
        addToast('offline', 'No internet connection. Form saved offline.');
      } else {
        addToast('error', 'Network error. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center p-4 sm:p-6 lg:p-10"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl mx-auto"
        >
          {/* Connection Status Banner */}
          <motion.div
            variants={itemVariants}
            className={`mb-6 p-4 rounded-xl border-l-4 ${
              isOnline 
                ? 'bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300'
                : 'bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:border-red-400 dark:text-red-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5" />
                  <span className="font-medium">Online - Form will submit to server</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5" />
                  <span className="font-medium">Offline - Form will be saved locally</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Offline Submissions Status */}
          {offlineSubmissions.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-800 dark:text-blue-300">
                    {offlineSubmissions.filter(s => s.status === 'pending').length} offline submission(s) pending
                  </span>
                </div>
                {isOnline && (
                  <Button
                    onClick={syncOfflineSubmissions}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sync Now
                  </Button>
                )}
              </div>
              {offlineSubmissions.map(submission => (
                <div key={submission.id} className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                  {submission.data.firstName} {submission.data.lastName} - {submission.data.email}
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    submission.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    submission.status === 'syncing' ? 'bg-blue-100 text-blue-800' :
                    submission.status === 'synced' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {submission.status}
                  </span>
                </div>
              ))}
            </motion.div>
          )}

          <motion.div
            variants={itemVariants}
            className="text-center mb-8"
          >
            <h3 className="text-2xl sm:text-3xl font-semibold text-foreground dark:text-foreground mb-2">
              Register to Workspace
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-muted-foreground">
              Take a few moments to register for your company&apos;s workspace
            </p>
          </motion.div>

          <motion.form
            variants={itemVariants}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-6">
              <motion.div
                variants={itemVariants}
                className="col-span-full sm:col-span-3"
              >
                <Label
                  htmlFor="firstName"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  First name
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  autoComplete="given-name"
                  placeholder="First name"
                  className={`mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500 ring-red-500' : ''
                  }`}
                  required
                />
                {errors.firstName && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.firstName}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full sm:col-span-3"
              >
                <Label
                  htmlFor="lastName"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  Last name
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  autoComplete="family-name"
                  placeholder="Last name"
                  className={`mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-500 ring-red-500' : ''
                  }`}
                  required
                />
                {errors.lastName && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.lastName}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full"
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  Email
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  placeholder="Email"
                  className={`mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500 ring-red-500' : ''
                  }`}
                  required
                />
                {errors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm mt-1 flex items-center gap-1"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {errors.email}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full"
              >
                <Label
                  htmlFor="address"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  Address
                </Label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  autoComplete="street-address"
                  placeholder="Address"
                  className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full sm:col-span-2"
              >
                <Label
                  htmlFor="city"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  City
                </Label>
                <Input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  autoComplete="address-level2"
                  placeholder="City"
                  className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full sm:col-span-2"
              >
                <Label
                  htmlFor="state"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  State
                </Label>
                <Input
                  type="text"
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  autoComplete="address-level1"
                  placeholder="State"
                  className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="col-span-full sm:col-span-2"
              >
                <Label
                  htmlFor="postalCode"
                  className="text-sm font-medium text-foreground dark:text-foreground"
                >
                  Postal code
                </Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  autoComplete="postal-code"
                  placeholder="Postal code"
                  className="mt-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </motion.div>
            </div>

            <Separator className="my-6" />

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4"
            >
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto transition-all duration-200 hover:scale-105"
                onClick={() => {
                  setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    address: '',
                    city: '',
                    state: '',
                    postalCode: ''
                  });
                  setErrors({});
                }}
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOnline 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                    : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
                }`}
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : isOnline ? (
                  'Submit Online'
                ) : (
                  'Save Offline'
                )}
              </Button>
            </motion.div>
          </motion.form>
        </motion.div>
      </motion.div>

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`flex items-center gap-3 p-4 rounded-lg shadow-lg border-l-4 ${
                toast.type === 'success'
                  ? 'bg-green-50 border-green-500 text-green-800'
                  : toast.type === 'error'
                  ? 'bg-red-50 border-red-500 text-red-800'
                  : toast.type === 'offline'
                  ? 'bg-orange-50 border-orange-500 text-orange-800'
                  : 'bg-blue-50 border-blue-500 text-blue-800'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
              {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'offline' && <WifiOff className="w-5 h-5 text-orange-500" />}
              {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-500" />}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
