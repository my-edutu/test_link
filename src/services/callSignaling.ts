// src/services/callSignaling.ts
// Real-time call signaling using Supabase Realtime

import { supabase } from '../supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';

export type CallType = 'voice' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed' | 'busy';

export interface CallSignal {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  receiverId: string;
  callType: CallType;
  status: CallStatus;
  timestamp: number;
}

export interface CallSignalingCallbacks {
  onIncomingCall?: (signal: CallSignal) => void;
  onCallAccepted?: (signal: CallSignal) => void;
  onCallDeclined?: (signal: CallSignal) => void;
  onCallEnded?: (signal: CallSignal) => void;
  onCallMissed?: (signal: CallSignal) => void;
}

class CallSignalingService {
  private userChannel: RealtimeChannel | null = null;
  private activeCallChannel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;
  private callbacks: CallSignalingCallbacks = {};
  private activeCall: CallSignal | null = null;
  private ringTimeout: NodeJS.Timeout | null = null;

  // Reconnection state
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionState: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';

  /**
   * Initialize the signaling service for a user
   * Call this when user logs in
   */
  async initialize(userId: string, callbacks: CallSignalingCallbacks) {
    this.currentUserId = userId;
    this.callbacks = callbacks;
    this.reconnectAttempts = 0;

    await this.setupUserChannel();
  }

  /**
   * Set up user channel with reconnection handling
   */
  private async setupUserChannel() {
    if (!this.currentUserId) return;

    // Clean up existing channel
    if (this.userChannel) {
      await supabase.removeChannel(this.userChannel);
    }

    // Subscribe to user's personal channel for incoming calls
    this.userChannel = supabase.channel(`calls:${this.currentUserId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.userChannel
      .on('broadcast', { event: 'incoming_call' }, ({ payload }) => {
        const signal = payload as CallSignal;
        console.log('[CallSignaling] Incoming call:', signal);
        this.handleIncomingCall(signal);
      })
      .on('broadcast', { event: 'call_cancelled' }, ({ payload }) => {
        const signal = payload as CallSignal;
        console.log('[CallSignaling] Call cancelled:', signal);
        this.handleCallCancelled(signal);
      })
      .subscribe((status, err) => {
        console.log('[CallSignaling] User channel status:', status, err);

        if (status === 'SUBSCRIBED') {
          this.connectionState = 'connected';
          this.isReconnecting = false;
          this.reconnectAttempts = 0;
          console.log('[CallSignaling] Successfully connected to signaling channel');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.connectionState = 'disconnected';
          console.warn('[CallSignaling] Channel disconnected, attempting reconnect...');
          this.handleChannelDisconnect();
        } else if (status === 'TIMED_OUT') {
          this.connectionState = 'disconnected';
          console.warn('[CallSignaling] Channel timed out, attempting reconnect...');
          this.handleChannelDisconnect();
        }
      });
  }

  /**
   * Handle channel disconnection with exponential backoff reconnection
   */
  private handleChannelDisconnect() {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[CallSignaling] Max reconnect attempts reached. Please restart the app.');
      }
      return;
    }

    this.isReconnecting = true;
    this.connectionState = 'reconnecting';

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;

    console.log(`[CallSignaling] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      this.isReconnecting = false;
      await this.setupUserChannel();
    }, delay);
  }

  /**
   * Get current connection state
   */
  getConnectionState(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionState;
  }

  /**
   * Check if signaling is connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  /**
   * Clean up when user logs out
   */
  async cleanup() {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.userChannel) {
      await supabase.removeChannel(this.userChannel);
      this.userChannel = null;
    }

    if (this.activeCallChannel) {
      await supabase.removeChannel(this.activeCallChannel);
      this.activeCallChannel = null;
    }

    this.currentUserId = null;
    this.callbacks = {};
    this.activeCall = null;
    this.connectionState = 'disconnected';
    this.isReconnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Force reconnect (call this if user manually triggers reconnect)
   */
  async forceReconnect() {
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    await this.setupUserChannel();
  }

  /**
   * Initiate a call to another user
   */
  async initiateCall(
    callId: string,
    receiverId: string,
    callerName: string,
    callerAvatar: string | undefined,
    callType: CallType
  ): Promise<boolean> {
    if (!this.currentUserId) {
      console.error('[CallSignaling] Not initialized');
      return false;
    }

    const signal: CallSignal = {
      callId,
      callerId: this.currentUserId,
      callerName,
      callerAvatar,
      receiverId,
      callType,
      status: 'ringing',
      timestamp: Date.now(),
    };

    this.activeCall = signal;

    // Subscribe to the call channel for responses
    await this.subscribeToCallChannel(callId);

    // Send incoming call signal to receiver's channel
    const receiverChannel = supabase.channel(`calls:${receiverId}`);

    await receiverChannel.subscribe();

    await receiverChannel.send({
      type: 'broadcast',
      event: 'incoming_call',
      payload: signal,
    });

    // Unsubscribe from receiver channel (we just needed to send)
    await supabase.removeChannel(receiverChannel);

    // Set timeout for missed call (30 seconds)
    this.ringTimeout = setTimeout(() => {
      if (this.activeCall?.status === 'ringing') {
        this.handleMissedCall();
      }
    }, 30000);

    return true;
  }

  /**
   * Cancel an outgoing call
   */
  async cancelCall() {
    if (!this.activeCall || !this.currentUserId) return;

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    const signal: CallSignal = {
      ...this.activeCall,
      status: 'ended',
      timestamp: Date.now(),
    };

    // Notify receiver that call was cancelled
    const receiverChannel = supabase.channel(`calls:${this.activeCall.receiverId}`);
    await receiverChannel.subscribe();
    await receiverChannel.send({
      type: 'broadcast',
      event: 'call_cancelled',
      payload: signal,
    });
    await supabase.removeChannel(receiverChannel);

    // Also notify on call channel
    if (this.activeCallChannel) {
      await this.activeCallChannel.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: signal,
      });
    }

    this.activeCall = null;
    await this.unsubscribeFromCallChannel();
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId: string): Promise<boolean> {
    if (!this.activeCall || this.activeCall.callId !== callId) {
      console.error('[CallSignaling] No matching active call to accept');
      return false;
    }

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    const signal: CallSignal = {
      ...this.activeCall,
      status: 'accepted',
      timestamp: Date.now(),
    };

    this.activeCall = signal;

    // Subscribe to call channel and send acceptance
    await this.subscribeToCallChannel(callId);

    if (this.activeCallChannel) {
      await this.activeCallChannel.send({
        type: 'broadcast',
        event: 'call_accepted',
        payload: signal,
      });
    }

    return true;
  }

  /**
   * Decline an incoming call
   */
  async declineCall(callId: string): Promise<boolean> {
    if (!this.activeCall || this.activeCall.callId !== callId) {
      console.error('[CallSignaling] No matching active call to decline');
      return false;
    }

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    const signal: CallSignal = {
      ...this.activeCall,
      status: 'declined',
      timestamp: Date.now(),
    };

    // Subscribe to call channel and send decline
    await this.subscribeToCallChannel(callId);

    if (this.activeCallChannel) {
      await this.activeCallChannel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: signal,
      });
    }

    this.activeCall = null;
    await this.unsubscribeFromCallChannel();

    return true;
  }

  /**
   * End an active call
   */
  async endCall() {
    if (!this.activeCall) return;

    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }

    const signal: CallSignal = {
      ...this.activeCall,
      status: 'ended',
      timestamp: Date.now(),
    };

    if (this.activeCallChannel) {
      await this.activeCallChannel.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: signal,
      });
    }

    this.activeCall = null;
    await this.unsubscribeFromCallChannel();
  }

  /**
   * Get the current active call
   */
  getActiveCall(): CallSignal | null {
    return this.activeCall;
  }

  /**
   * Check if there's an active call
   */
  hasActiveCall(): boolean {
    return this.activeCall !== null;
  }

  // Private methods

  private async subscribeToCallChannel(callId: string) {
    if (this.activeCallChannel) {
      await supabase.removeChannel(this.activeCallChannel);
    }

    this.activeCallChannel = supabase.channel(`call:${callId}`);

    this.activeCallChannel
      .on('broadcast', { event: 'call_accepted' }, ({ payload }) => {
        const signal = payload as CallSignal;
        console.log('[CallSignaling] Call accepted:', signal);
        this.handleCallAccepted(signal);
      })
      .on('broadcast', { event: 'call_declined' }, ({ payload }) => {
        const signal = payload as CallSignal;
        console.log('[CallSignaling] Call declined:', signal);
        this.handleCallDeclined(signal);
      })
      .on('broadcast', { event: 'call_ended' }, ({ payload }) => {
        const signal = payload as CallSignal;
        console.log('[CallSignaling] Call ended:', signal);
        this.handleCallEnded(signal);
      })
      .subscribe((status) => {
        console.log('[CallSignaling] Call channel status:', status);
      });
  }

  private async unsubscribeFromCallChannel() {
    if (this.activeCallChannel) {
      await supabase.removeChannel(this.activeCallChannel);
      this.activeCallChannel = null;
    }
  }

  private handleIncomingCall(signal: CallSignal) {
    // Don't process if we already have an active call
    if (this.activeCall) {
      // Send busy signal
      this.sendBusySignal(signal);
      return;
    }

    this.activeCall = signal;

    // Set timeout for missed call
    this.ringTimeout = setTimeout(() => {
      if (this.activeCall?.status === 'ringing') {
        this.handleMissedCall();
      }
    }, 30000);

    this.callbacks.onIncomingCall?.(signal);
  }

  private handleCallAccepted(signal: CallSignal) {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    this.activeCall = signal;
    this.callbacks.onCallAccepted?.(signal);
  }

  private handleCallDeclined(signal: CallSignal) {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    this.activeCall = null;
    this.unsubscribeFromCallChannel();
    this.callbacks.onCallDeclined?.(signal);
  }

  private handleCallEnded(signal: CallSignal) {
    if (this.ringTimeout) {
      clearTimeout(this.ringTimeout);
      this.ringTimeout = null;
    }
    this.activeCall = null;
    this.unsubscribeFromCallChannel();
    this.callbacks.onCallEnded?.(signal);
  }

  private handleCallCancelled(signal: CallSignal) {
    if (this.activeCall?.callId === signal.callId) {
      if (this.ringTimeout) {
        clearTimeout(this.ringTimeout);
        this.ringTimeout = null;
      }
      this.activeCall = null;
      this.callbacks.onCallEnded?.(signal);
    }
  }

  private handleMissedCall() {
    if (!this.activeCall) return;

    const signal: CallSignal = {
      ...this.activeCall,
      status: 'missed',
      timestamp: Date.now(),
    };

    this.activeCall = null;
    this.unsubscribeFromCallChannel();
    this.callbacks.onCallMissed?.(signal);
  }

  private async sendBusySignal(signal: CallSignal) {
    const busySignal: CallSignal = {
      ...signal,
      status: 'busy',
      timestamp: Date.now(),
    };

    const callChannel = supabase.channel(`call:${signal.callId}`);
    await callChannel.subscribe();
    await callChannel.send({
      type: 'broadcast',
      event: 'call_declined',
      payload: busySignal,
    });
    await supabase.removeChannel(callChannel);
  }
}

// Export singleton instance
export const callSignaling = new CallSignalingService();
