import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Alert } from 'react-native';
import { useLinkTo, useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../supabaseClient';

const AuthCallbackScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const params = route.params || {};
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('loading');

        // Handle different types of auth callbacks
        const code = params?.code || params?.queryParams?.code;
        const type = params?.type || params?.queryParams?.type;
        const accessToken = params?.access_token || params?.queryParams?.access_token;
        const refreshToken = params?.refresh_token || params?.queryParams?.refresh_token;
        const error = params?.error || params?.queryParams?.error;
        const errorDescription = params?.error_description || params?.queryParams?.error_description;

        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setErrorMessage(errorDescription || 'Authentication failed');
          setStatus('error');
          return;
        }

        // Handle password recovery and magic link style callbacks that provide tokens directly
        if ((type === 'recovery' || type === 'signup' || type === 'magiclink' || type === 'email_change') && accessToken) {
          console.log('Processing direct token callback for type:', type);
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });

          if (setSessionError) {
            console.error('Set session error:', setSessionError);
            setErrorMessage(setSessionError.message);
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('Session established for type:', type);
            setStatus('success');
            if (type === 'recovery') {
              // Navigate user to set a new password
              // Ensure your navigator has a 'NewPassword' route
              navigation.navigate('NewPassword', { fromRecovery: true });
              return;
            }
            // For other types, AuthGate should take over
          } else {
            setErrorMessage('No session received');
            setStatus('error');
          }
        } else if (code) {
          console.log('Processing OAuth code...');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);
            setErrorMessage(exchangeError.message);
            setStatus('error');
            return;
          }

          if (data.session) {
            console.log('OAuth sign-in successful');
            setStatus('success');
            // Navigation will be handled by AuthGate
          } else {
            setErrorMessage('No session received');
            setStatus('error');
          }
        } else {
          // No code provided, check if we have an active session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('success');
          } else {
            setErrorMessage('No authentication code found');
            setStatus('error');
          }
        }
      } catch (e: any) {
        console.error('Auth callback error:', e);
        setErrorMessage(e?.message || 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [params]);

  useEffect(() => {
    if (status === 'error') {
      // Show error alert and navigate back
      Alert.alert(
        'Authentication Failed',
        errorMessage,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('SignIn'),
          },
        ]
      );
    }
  }, [status, errorMessage, navigation]);

  const getStatusText = () => {
    switch (status) {
      case 'loading':
        return 'Completing sign in...';
      case 'success':
        return 'Sign in successful!';
      case 'error':
        return 'Sign in failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator
        size="large"
        color={status === 'error' ? '#EF4444' : '#FF8A00'}
      />
      <Text style={[
        styles.text,
        { color: status === 'error' ? '#EF4444' : '#6B7280' }
      ]}>
        {getStatusText()}
      </Text>
      {status === 'error' && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    marginTop: 8,
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AuthCallbackScreen;


