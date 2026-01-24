import { useState, useEffect, useCallback } from 'react';
import * as Network from 'expo-network';
import { AppState, AppStateStatus } from 'react-native';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: Network.NetworkStateType | null;
}

export function useNetwork() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
  });

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        type: state.type ?? null,
      });
    } catch (error) {
      console.error('Error checking network state:', error);
      setNetworkState({
        isConnected: false,
        isInternetReachable: false,
        type: null,
      });
    }
  }, []);

  useEffect(() => {
    // Initial check
    checkNetwork();

    // Set up polling interval (expo-network doesn't have event listeners)
    const intervalId = setInterval(checkNetwork, 5000);

    // Also check when app comes to foreground
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkNetwork();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [checkNetwork]);

  return {
    isConnected: networkState.isConnected,
    isInternetReachable: networkState.isInternetReachable,
    networkType: networkState.type,
    refresh: checkNetwork,
  };
}

export default useNetwork;
