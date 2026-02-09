// src/context/CallProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation, NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from './AuthProvider';
import { callSignaling, CallSignal, CallSignalingCallbacks } from '../services/callSignaling';

interface CallContextType {
  incomingCall: CallSignal | null;
  isInCall: boolean;
  initiateCall: (
    receiverId: string,
    receiverName: string,
    callType: 'voice' | 'video'
  ) => Promise<string | null>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  endCall: () => Promise<void>;
  cancelCall: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

interface CallProviderProps {
  children: React.ReactNode;
  navigationRef: any; // Using any for compatibility with useNavigationContainerRef
}

export const CallProvider: React.FC<CallProviderProps> = ({ children, navigationRef }) => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const appState = useRef(AppState.currentState);
  const isInitialized = useRef(false);

  // Setup notification channel for calls on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('calls', {
        name: 'Incoming Calls',
        description: 'Notifications for incoming voice and video calls',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#FF8A00',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Initialize call signaling when user is available
  useEffect(() => {
    if (!user?.id || isInitialized.current) return;

    const callbacks: CallSignalingCallbacks = {
      onIncomingCall: handleIncomingCall,
      onCallAccepted: handleCallAccepted,
      onCallDeclined: handleCallDeclined,
      onCallEnded: handleCallEnded,
      onCallMissed: handleCallMissed,
    };

    callSignaling.initialize(user.id, callbacks);
    isInitialized.current = true;

    return () => {
      callSignaling.cleanup();
      isInitialized.current = false;
    };
  }, [user?.id]);

  const handleIncomingCall = useCallback((signal: CallSignal) => {
    console.log('[CallProvider] Incoming call:', signal);
    setIncomingCall(signal);

    // Show push notification if app is in background
    if (appState.current !== 'active') {
      showIncomingCallNotification(signal);
    }

    // Navigate to incoming call screen
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate('IncomingCall', { callSignal: signal });
    }
  }, [navigationRef]);

  const handleCallAccepted = useCallback((signal: CallSignal) => {
    console.log('[CallProvider] Call accepted:', signal);
    setIsInCall(true);
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();
  }, []);

  const handleCallDeclined = useCallback((signal: CallSignal) => {
    console.log('[CallProvider] Call declined:', signal);
    setIsInCall(false);
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();

    // Go back if we're on a call-related screen
    if (navigationRef.current?.isReady()) {
      navigationRef.current.goBack();
    }
  }, [navigationRef]);

  const handleCallEnded = useCallback((signal: CallSignal) => {
    console.log('[CallProvider] Call ended:', signal);
    setIsInCall(false);
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();
  }, []);

  const handleCallMissed = useCallback((signal: CallSignal) => {
    console.log('[CallProvider] Call missed:', signal);
    setIsInCall(false);
    setIncomingCall(null);
    Notifications.dismissAllNotificationsAsync();

    // Show missed call notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Missed Call',
        body: `You missed a ${signal.callType} call from ${signal.callerName}`,
        data: { screen: 'chat', userId: signal.callerId },
        sound: true,
      },
      trigger: null, // Show immediately
    });

    // Navigate back if on incoming call screen
    if (navigationRef.current?.isReady()) {
      navigationRef.current.goBack();
    }
  }, [navigationRef]);

  const showIncomingCallNotification = async (signal: CallSignal) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Incoming ${signal.callType === 'video' ? 'Video' : 'Voice'} Call`,
        body: `${signal.callerName} is calling you`,
        data: {
          screen: 'IncomingCall',
          callSignal: signal,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'incoming_call',
      },
      trigger: null, // Show immediately
    });
  };

  const initiateCall = useCallback(async (
    receiverId: string,
    receiverName: string,
    callType: 'voice' | 'video'
  ): Promise<string | null> => {
    if (!user?.id) return null;

    // Generate a unique call ID
    const sorted = [user.id, receiverId].sort();
    const callId = `${sorted[0]}_${sorted[1]}_${Date.now()}`;

    const userName = user.fullName || user.username || 'User';
    const userAvatar = user.imageUrl;

    const success = await callSignaling.initiateCall(
      callId,
      receiverId,
      userName,
      userAvatar,
      callType
    );

    if (success) {
      setIsInCall(true);
      return callId;
    }

    return null;
  }, [user]);

  const acceptCall = useCallback(async () => {
    if (!incomingCall) return;
    await callSignaling.acceptCall(incomingCall.callId);
    setIsInCall(true);
  }, [incomingCall]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;
    await callSignaling.declineCall(incomingCall.callId);
    setIncomingCall(null);
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    await callSignaling.endCall();
    setIsInCall(false);
  }, []);

  const cancelCall = useCallback(async () => {
    await callSignaling.cancelCall();
    setIsInCall(false);
  }, []);

  const value: CallContextType = {
    incomingCall,
    isInCall,
    initiateCall,
    acceptCall,
    declineCall,
    endCall,
    cancelCall,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};
