import * as Linking from 'expo-linking';
import { NavigationContainerRef } from '@react-navigation/native';

export interface DeepLinkData {
  type: 'auth' | 'navigation' | 'content' | 'social';
  screen?: string;
  params?: Record<string, any>;
  action?: string;
}

export class DeepLinkHandler {
  private navigationRef: NavigationContainerRef<any> | null = null;

  setNavigationRef(ref: NavigationContainerRef<any>) {
    this.navigationRef = ref;
  }

  /**
   * Parse a deep link URL and extract relevant information
   */
  parseDeepLink(url: string): DeepLinkData | null {
    try {
      const parsedUrl = new URL(url);
      const path = parsedUrl.pathname;
      const params = Object.fromEntries(parsedUrl.searchParams.entries());

      // Handle authentication callbacks
      if (path.includes('auth-callback') || params.code || params.error) {
        return {
          type: 'auth',
          action: 'callback',
          params,
        };
      }

      // Handle Expo Go auth callbacks
      if (url.includes('auth-callback') || url.includes('auth-callback')) {
        return {
          type: 'auth',
          action: 'callback',
          params,
        };
      }

      // Handle custom scheme auth callbacks (lingualink://auth-callback)
      if (url.startsWith('lingualink://auth-callback')) {
        return {
          type: 'auth',
          action: 'callback',
          params,
        };
      }

      // Handle navigation deep links
      if (path.startsWith('/')) {
        const segments = path.split('/').filter(Boolean);

        if (segments.length > 0) {
          const screen = segments[0];

          switch (screen) {
            case 'chat':
              return {
                type: 'navigation',
                screen: 'ChatDetail',
                params: { contact: { id: segments[1] || params.id } },
              };
            case 'group':
              return {
                type: 'navigation',
                screen: 'GroupChat',
                params: { group: { id: segments[1] || params.id } },
              };
            case 'call':
              if (segments[1] === 'voice') {
                return {
                  type: 'navigation',
                  screen: 'VoiceCall',
                  params: { contact: { id: segments[2] || params.id } },
                };
              } else if (segments[1] === 'video') {
                return {
                  type: 'navigation',
                  screen: 'VideoCall',
                  params: { contact: { id: segments[2] || params.id } },
                };
              }
              break;
            case 'live':
              return {
                type: 'navigation',
                screen: 'LiveStream',
                params: { roomId: segments[1] || params.roomId },
              };
            case 'games':
              if (segments[1] === 'turnverse') {
                return {
                  type: 'navigation',
                  screen: 'TurnVerse',
                };
              }
              break;
            case 'discover':
              return {
                type: 'navigation',
                screen: 'ContactDiscovery',
              };
            default:
              return {
                type: 'navigation',
                screen: segments[0].charAt(0).toUpperCase() + segments[0].slice(1),
                params,
              };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing deep link:', error);
      return null;
    }
  }

  /**
   * Navigate to a screen based on deep link data
   */
  navigateToDeepLink(data: DeepLinkData) {
    if (!this.navigationRef || !data.screen) {
      return;
    }

    try {
      // Navigate to the specified screen with params
      this.navigationRef.navigate(data.screen as any, data.params);
    } catch (error) {
      console.error('Error navigating to deep link screen:', error);
    }
  }

  /**
   * Handle a deep link URL
   */
  handleDeepLink(url: string) {
    const deepLinkData = this.parseDeepLink(url);

    if (deepLinkData) {
      console.log('Deep link parsed:', deepLinkData);

      if (deepLinkData.type === 'navigation') {
        this.navigateToDeepLink(deepLinkData);
      } else if (deepLinkData.type === 'auth') {
        // Handle auth callbacks by navigating to AuthCallback screen
        this.navigateToAuthCallback(deepLinkData);
      }

      return deepLinkData;
    }

    return null;
  }

  /**
   * Navigate to AuthCallback screen with auth parameters
   */
  navigateToAuthCallback(data: DeepLinkData) {
    if (!this.navigationRef) {
      return;
    }

    try {
      // Navigate to AuthCallback with the auth parameters
      this.navigationRef.navigate('AuthCallback' as any, data.params);
    } catch (error) {
      console.error('Error navigating to AuthCallback:', error);
    }
  }

  /**
   * Create a deep link URL for sharing
   */
  createDeepLink(screen: string, params?: Record<string, any>): string {
    // Use Expo Go compatible URL format
    const baseUrl = 'exp://localhost:8081/--/';
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `${baseUrl}${screen}${queryString}`;
  }

  /**
   * Create an Expo Go compatible deep link URL
   */
  createExpoDeepLink(screen: string, params?: Record<string, any>): string {
    const baseUrl = 'exp+lingualink://';
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return `${baseUrl}${screen}${queryString}`;
  }

  /**
   * Open a deep link URL
   */
  async openDeepLink(url: string): Promise<boolean> {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error opening deep link:', error);
      return false;
    }
  }
}

export const deepLinkHandler = new DeepLinkHandler();


