"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  WifiOff,
  Wifi,
  Clock,
  MapPin,
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the LocationMap to avoid SSR issues
const LocationMap = dynamic(
  () => import("@/components/ui/location-map").then((mod) => mod.LocationMap),
  { ssr: false }
);

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude?: number;
  longitude?: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number | null;
}

interface FormErrors {
  [key: string]: string;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "offline";
  message: string;
}

interface OfflineSubmission {
  id: string;
  data: FormData;
  timestamp: number;
  status: "pending" | "syncing" | "synced" | "failed";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80 } },
};

const buttonVariants: Variants = {
  hover: { scale: 1.06, boxShadow: "0 2px 8px 0 rgba(99,102,241,0.12)" },
  tap: { scale: 0.97 },
};

export function FormLayout() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineSubmissions, setOfflineSubmissions] = useState<
    OfflineSubmission[]
  >([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [showLocationCard, setShowLocationCard] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, message };
    setToasts((prev) => [...prev, newToast]);

    // Auto remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const syncOfflineSubmissions = useCallback(async () => {
    const pendingSubmissions = offlineSubmissions.filter(
      (s) => s.status === "pending"
    );

    if (pendingSubmissions.length === 0) return;

    addToast(
      "info",
      `Syncing ${pendingSubmissions.length} offline submission(s)...`
    );

    for (const submission of pendingSubmissions) {
      try {
        // Update status to syncing
        const updatedSubmissions = offlineSubmissions.map((s) =>
          s.id === submission.id ? { ...s, status: "syncing" as const } : s
        );
        setOfflineSubmissions(updatedSubmissions);

        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Update status to synced
        const finalSubmissions = offlineSubmissions.map((s) =>
          s.id === submission.id ? { ...s, status: "synced" as const } : s
        );
        setOfflineSubmissions(finalSubmissions);

        addToast("success", `Offline submission synced successfully!`);
      } catch {
        // Update status to failed
        const failedSubmissions = offlineSubmissions.map((s) =>
          s.id === submission.id ? { ...s, status: "failed" as const } : s
        );
        setOfflineSubmissions(failedSubmissions);

        addToast("error", `Failed to sync offline submission`);
      }
    }

    // Remove synced submissions after a delay
    setTimeout(() => {
      const remainingSubmissions = offlineSubmissions.filter(
        (s) => s.status !== "synced"
      );
      setOfflineSubmissions(remainingSubmissions);
    }, 3000);
  }, [offlineSubmissions, addToast]);

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

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Set initial status
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [offlineSubmissions.length, syncOfflineSubmissions, watchId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const saveOfflineSubmission = (data: FormData): string => {
    const submission: OfflineSubmission = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      status: "pending",
    };

    const updatedSubmissions = [...offlineSubmissions, submission];
    setOfflineSubmissions(updatedSubmissions);

    return submission.id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      addToast("error", "Please fix the errors in the form");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isOnline) {
        // Handle offline submission
        saveOfflineSubmission(formData);

        addToast(
          "offline",
          "Form saved offline! Will sync when connection returns."
        );

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
        });

        setIsSubmitting(false);
        return;
      }

      // Online submission
      addToast("info", "Submitting form...");

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simulate success/failure randomly for demo
      const isSuccess = Math.random() > 0.3; // 70% success rate

      if (isSuccess) {
        addToast(
          "success",
          "Form submitted successfully! Welcome to the workspace!"
        );
        // Reset form on success
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
        });
      } else {
        addToast("error", "Submission failed. Please try again.");
      }
    } catch {
      if (!isOnline) {
        addToast("offline", "No internet connection. Form saved offline.");
      } else {
        addToast(
          "error",
          "Network error. Please check your connection and try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Geolocation handlers
  const handleGetLocation = () => {
    console.log("Get Location button clicked");

    if (!navigator.geolocation) {
      addToast("error", "Geolocation is not supported by your browser");
      return;
    }

    setLocationLoading(true);
    setShowLocationCard(false); // Reset state
    setShowMap(false); // Hide map when getting single location

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Location obtained:", position);

        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };

        console.log("Location data to set:", locationData);

        setFormData((prev) => ({
          ...prev,
          ...locationData,
        }));

        setShowLocationCard(true); // Show card
        setTracking(false); // Stop tracking if it was running
        setLocationLoading(false);

        addToast("success", "Location obtained successfully!");

        // Log the current formData to verify it's set correctly
        setTimeout(() => {
          console.log("Current formData after setting location:", {
            ...formData,
            ...locationData,
          });
        }, 100);
      },
      (error) => {
        console.error("Geolocation error:", error);
        addToast("error", `Failed to get location: ${error.message}`);
        setLocationLoading(false);
        setShowLocationCard(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const handleStartTracking = () => {
    console.log("Start Tracking button clicked");

    if (!navigator.geolocation) {
      addToast("error", "Geolocation is not supported by your browser");
      return;
    }

    if (tracking) {
      // Stop tracking
      handleStopTracking();
      return;
    }

    setTracking(true);
    setShowLocationCard(false); // Hide card when tracking starts
    setShowMap(true); // Show map when tracking

    const id = navigator.geolocation.watchPosition(
      (position) => {
        console.log("Tracking position update:", position);

        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        };

        setFormData((prev) => ({
          ...prev,
          ...locationData,
        }));
      },
      (error) => {
        console.error("Tracking error:", error);
        addToast("error", `Failed to track location: ${error.message}`);
        setTracking(false);
        setShowMap(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );

    setWatchId(id);
    addToast("info", "Location tracking started");
  };

  const handleStopTracking = () => {
    console.log("Stop Tracking called");

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    setTracking(false);
    setShowMap(false);
    addToast("info", "Location tracking stopped");
  };

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900"
      >
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 120, damping: 18, duration: 0.7 }}
          whileHover={{
            boxShadow: "0 8px 32px 0 rgba(99,102,241,0.25), 0 1.5px 12px 0 rgba(168,139,250,0.15)",
            scale: 1.01,
            borderColor: "#a78bfa",
          }}
          whileTap={{ scale: 0.98 }}
          className="w-full max-w-2xl mx-auto rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl bg-white/70 dark:bg-gray-900/80 backdrop-blur-lg transition-all duration-300"
          style={{
            boxShadow:
              "0 8px 32px 0 rgba(99,102,241,0.15), 0 1.5px 12px 0 rgba(168,139,250,0.10)",
            border: "1.5px solid rgba(168,139,250,0.18)",
          }}
        >
          {/* Connection Status Banner */}
          <motion.div variants={itemVariants} className={`mb-6 p-4 rounded-xl border-l-4 ${
            isOnline
              ? "bg-green-50 border-green-500 text-green-800 dark:bg-green-900/20 dark:border-green-400 dark:text-green-300"
              : "bg-red-50 border-red-500 text-red-800 dark:bg-red-900/20 dark:border-red-400 dark:text-red-300"
          }`}>
            <div className="flex items-center gap-3">
              {isOnline ? (
                <>
                  <Wifi className="w-5 h-5" />
                  <span className="font-medium">
                    Online - Form will submit to server
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5" />
                  <span className="font-medium">
                    Offline - Form will be saved locally
                  </span>
                </>
              )}
            </div>
          </motion.div>

          {/* Offline Submissions Status */}
          <AnimatePresence>
            {offlineSubmissions.length > 0 && (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-800 dark:text-blue-300">
                      {
                        offlineSubmissions.filter((s) => s.status === "pending")
                          .length
                      }{" "}
                      offline submission(s) pending
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
                {offlineSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="mt-2 text-sm text-blue-700 dark:text-blue-400"
                  >
                    {submission.data.firstName} {submission.data.lastName} -{" "}
                    {submission.data.email}
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs ${
                        submission.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : submission.status === "syncing"
                          ? "bg-blue-100 text-blue-800"
                          : submission.status === "synced"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {submission.status}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div variants={itemVariants} className="text-center mb-8">
            <h3 className="text-2xl sm:text-3xl font-semibold text-foreground dark:text-foreground mb-2">
              Register to Workspace
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-muted-foreground">
              Take a few moments to register for your company&apos;s workspace
            </p>
          </motion.div>

          <motion.form
            variants={containerVariants}
            onSubmit={handleSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 sm:p-8"
          >
            <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-6">
              {/* Animate each field */}
              <motion.div variants={itemVariants} className="col-span-full sm:col-span-3">
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
                    errors.firstName ? "border-red-500 ring-red-500" : ""
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

              <motion.div variants={itemVariants} className="col-span-full sm:col-span-3">
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
                    errors.lastName ? "border-red-500 ring-red-500" : ""
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

              <motion.div variants={itemVariants} className="col-span-full">
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
                    errors.email ? "border-red-500 ring-red-500" : ""
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

              <motion.div variants={itemVariants} className="col-span-full">
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

              <motion.div variants={itemVariants} className="col-span-full sm:col-span-2">
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

              <motion.div variants={itemVariants} className="col-span-full sm:col-span-2">
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

              <motion.div variants={itemVariants} className="col-span-full sm:col-span-2">
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

            {/* Geolocation Section */}
            <motion.div variants={itemVariants} className="col-span-full">
              <Label className="text-sm font-medium text-foreground dark:text-foreground mb-4 block">
                Device Location
              </Label>
              <div className="flex items-center gap-3 mb-4">
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={locationLoading}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <MapPin className="w-4 h-4" />
                    {locationLoading ? "Getting Location..." : "Get Location"}
                  </motion.button>
                </motion.div>
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={handleStartTracking}
                    className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${
                      tracking
                        ? "bg-red-500 hover:bg-red-600 text-white"
                        : "bg-green-500 hover:bg-green-600 text-white"
                    }`}
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    {tracking ? "Stop Tracking" : "Start Tracking"}
                  </motion.button>
                </motion.div>
              </div>

              {/* Location Feature Panel */}
              <AnimatePresence>
                {showLocationCard &&
                  formData.latitude !== undefined &&
                  formData.longitude !== undefined && (
                    <motion.div
                      initial={{ opacity: 0, y: 24, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 24, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 80, damping: 18 }}
                      className="mb-6 rounded-2xl bg-gradient-to-br from-blue-400/80 via-purple-400/80 to-pink-400/80 p-1 shadow-xl"
                    >
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-6">
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className="relative">
                            <span className="absolute animate-ping inline-flex h-16 w-16 rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-16 w-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 items-center justify-center">
                              <MapPin className="w-8 h-8 text-white" />
                            </span>
                          </div>
                          <span className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                            Live Location
                          </span>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-bold text-blue-700 dark:text-blue-300">
                              Latitude:
                            </span>
                            <span className="ml-2">
                              {formData.latitude?.toFixed(6) ?? "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-700 dark:text-blue-300">
                              Longitude:
                            </span>
                            <span className="ml-2">
                              {formData.longitude?.toFixed(6) ?? "N/A"}
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-purple-700 dark:text-purple-300">
                              Altitude:
                            </span>
                            <span className="ml-2">
                              {formData.altitude?.toFixed(2) ?? "N/A"} m
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-pink-700 dark:text-pink-300">
                              Accuracy:
                            </span>
                            <span className="ml-2">
                              {formData.accuracy?.toFixed(2) ?? "N/A"} m
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-700 dark:text-blue-300">
                              Speed:
                            </span>
                            <span className="ml-2">
                              {formData.speed?.toFixed(2) ?? "N/A"} m/s
                            </span>
                          </div>
                          <div>
                            <span className="font-bold text-purple-700 dark:text-purple-300">
                              Heading:
                            </span>
                            <span className="ml-2">
                              {formData.heading?.toFixed(2) ?? "N/A"}°
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formData.timestamp
                              ? new Date(formData.timestamp).toLocaleString()
                              : "N/A"}
                          </span>
                          <span className="mt-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold shadow">
                            Device Details Secured
                          </span>
                        </div>
                      </div>
                      {/* Map Links */}
                      <div className="flex justify-center gap-4 mt-4">
                        <a
                          href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-[#4285F4] text-white font-semibold shadow hover:bg-[#3367D6] transition"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                              fill="currentColor"
                            />
                          </svg>
                          View in Google Maps
                        </a>
                        <a
                          href={`https://maps.apple.com/?ll=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white font-semibold shadow hover:bg-gray-800 transition"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M17.472 6.382c-1.03-1.23-2.47-1.38-3.01-1.38-.13 0-.26.01-.38.02-.37.04-.73.13-1.08.26-.36.13-.7.3-1.03.5-.32.2-.62.43-.90.7-.27.27-.52.56-.75.87-.23.31-.43.65-.60 1.01-.17.36-.31.74-.41 1.13-.10.39-.16.80-.18 1.21-.02.41.01.82.09 1.23.08.41.21.81.39 1.19.18.38.41.74.68 1.08.27.34.58.65.92.92.34.27.70.50 1.08.68.38.18.78.31 1.19.39.41.08.82.11 1.23.09.41-.02.82-.08 1.21-.18.39-.10.77-.24 1.13-.41.36-.17.70-.37 1.01-.60.31-.23.60-.48.87-.75.27-.27.50-.57.70-.90.20-.33.37-.67.50-1.03.13-.35.22-.71.26-1.08.01-.12.02-.25.02-.38 0-.54-.15-1.98-1.38-3.01z"
                              fill="currentColor"
                            />
                          </svg>
                          View in Apple Maps
                        </a>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Live Map Panel */}
              <AnimatePresence>
                {(tracking || (showMap && formData.latitude && formData.longitude)) && (
                  <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 80, damping: 18 }}
                    className="mb-6 rounded-2xl bg-gradient-to-br from-blue-400/80 via-purple-400/80 to-pink-400/80 p-1 shadow-xl"
                  >
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="font-semibold text-green-700 dark:text-green-300">
                          {tracking ? "Tracking Active" : "Location Map"}
                        </span>
                      </div>
                      <LocationMap
                        latitude={formData.latitude!}
                        longitude={formData.longitude!}
                      />
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                        Powered by OpenStreetMap & Leaflet
                      </div>
                      <div className="flex justify-center gap-4 mt-4">
                        <a
                          href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-[#4285F4] text-white font-semibold shadow hover:bg-[#3367D6] transition"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"
                              fill="currentColor"
                            />
                          </svg>
                          View in Google Maps
                        </a>
                        <a
                          href={`https://maps.apple.com/?ll=${formData.latitude},${formData.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white font-semibold shadow hover:bg-gray-800 transition"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M17.472 6.382c-1.03-1.23-2.47-1.38-3.01-1.38-.13 0-.26.01-.38.02-.37.04-.73.13-1.08.26-.36.13-.7.3-1.03.5-.32.2-.62.43-.90.7-.27.27-.52.56-.75.87-.23.31-.43.65-.60 1.01-.17.36-.31.74-.41 1.13-.10.39-.16.80-.18 1.21-.02.41.01.82.09 1.23.08.41.21.81.39 1.19.18.38.41.74.68 1.08.27.34.58.65.92.92.34.27.70.50 1.08.68.38.18.78.31 1.19.39.41.08.82.11 1.23.09.41-.02.82-.08 1.21-.18.39-.10.77-.24 1.13-.41.36-.17.70-.37 1.01-.60.31-.23.60-.48.87-.75.27-.27.50-.57.70-.90.20-.33.37-.67.50-1.03.13-.35.22-.71.26-1.08.01-.12.02-.25.02-.38 0-.54-.15-1.98-1.38-3.01z"
                              fill="currentColor"
                            />
                          </svg>
                          View in Apple Maps
                        </a>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4"
            >
              <motion.button
                type="button"
                className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold transition-all duration-200 hover:scale-105"
                onClick={() => {
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    address: "",
                    city: "",
                    state: "",
                    postalCode: "",
                  });
                  setErrors({});
                  setShowLocationCard(false);
                  setTracking(false);
                  setShowMap(false);
                  if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                    setWatchId(null);
                  }
                }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                Clear Form
              </motion.button>
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOnline
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                }`}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                {isSubmitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : isOnline ? (
                  "Submit Online"
                ) : (
                  "Save Offline"
                )}
              </motion.button>
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
                toast.type === "success"
                  ? "bg-green-50 border-green-500 text-green-800"
                  : toast.type === "error"
                  ? "bg-red-50 border-red-500 text-red-800"
                  : toast.type === "offline"
                  ? "bg-orange-50 border-orange-500 text-orange-800"
                  : "bg-blue-50 border-blue-500 text-blue-800"
              }`}
            >
              {toast.type === "success" && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
              {toast.type === "error" && (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              {toast.type === "offline" && (
                <WifiOff className="w-5 h-5 text-orange-500" />
              )}
              {toast.type === "info" && (
                <AlertCircle className="w-5 h-5 text-blue-500" />
              )}
              <span className="font-medium">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}