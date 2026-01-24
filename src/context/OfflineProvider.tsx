import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNetwork } from '../hooks/useNetwork';
import { syncManager, SyncEvent } from '../services/local/SyncManager';
import { getQueueCount } from '../services/local/queue';

interface OfflineContextValue {
  isConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  forceSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue>({
  isConnected: true,
  isSyncing: false,
  pendingCount: 0,
  forceSync: async () => {},
});

export const useOffline = () => useContext(OfflineContext);

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const { isConnected } = useNetwork();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Show toast message
  const showToast = useCallback((message: string, duration = 3000) => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }

    setToastMessage(message);
    Animated.timing(toastOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, duration);
  }, [toastOpacity]);

  // Initialize sync manager and subscribe to events
  useEffect(() => {
    syncManager.initialize();

    const unsubscribe = syncManager.subscribe((event: SyncEvent) => {
      switch (event.type) {
        case 'sync_started':
          setIsSyncing(true);
          showToast(`Syncing ${event.data?.total ?? 0} pending changes...`);
          break;

        case 'sync_completed':
          setIsSyncing(false);
          if (event.data?.processed && event.data.processed > 0) {
            showToast(`Synced ${event.data.processed} changes successfully`);
          }
          updatePendingCount();
          break;

        case 'sync_failed':
          setIsSyncing(false);
          showToast('Some changes failed to sync. Will retry later.');
          updatePendingCount();
          break;

        case 'connection_changed':
          if (event.data?.isConnected) {
            showToast('Connection restored. Syncing changes...');
          }
          break;

        case 'item_processed':
          updatePendingCount();
          break;

        case 'item_failed':
          updatePendingCount();
          break;
      }
    });

    // Initial count
    updatePendingCount();

    return () => {
      unsubscribe();
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
    };
  }, [showToast]);

  // Show offline toast when connection changes
  useEffect(() => {
    if (!isConnected) {
      showToast('You are offline. Changes will be saved locally.', 4000);
    }
  }, [isConnected, showToast]);

  const updatePendingCount = async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  };

  const forceSync = useCallback(async () => {
    await syncManager.forcSync();
  }, []);

  const value: OfflineContextValue = {
    isConnected,
    isSyncing,
    pendingCount,
    forceSync,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}

      {/* Offline Status Bar */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <View style={styles.offlineDot} />
          <Text style={styles.offlineBannerText}>
            Offline Mode {pendingCount > 0 ? `• ${pendingCount} pending` : ''}
          </Text>
        </View>
      )}

      {/* Syncing Indicator */}
      {isSyncing && isConnected && (
        <View style={styles.syncingBanner}>
          <Text style={styles.syncingText}>Syncing...</Text>
        </View>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </OfflineContext.Provider>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#FEF3C7',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F59E0B',
    marginRight: 8,
  },
  offlineBannerText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '500',
  },
  syncingBanner: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#DBEAFE',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  syncingText: {
    color: '#1E40AF',
    fontSize: 14,
    fontWeight: '500',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1001,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default OfflineProvider;
