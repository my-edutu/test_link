import { getDatabase } from './db';
import * as Crypto from 'expo-crypto';

export type InteractionType = 'like' | 'unlike' | 'comment' | 'follow' | 'unfollow';
export type TargetType = 'voice_clip' | 'video_clip' | 'story' | 'comment' | 'user';
export type ActionType = 'add' | 'remove';

export interface InteractionMetadata {
  // Comment specific
  content?: string;
  audio_url?: string;
  audio_duration?: number;
  parent_comment_id?: string;
}

export interface QueuedInteraction {
  id: string;
  user_id: string;
  interaction_type: InteractionType;
  target_id: string;
  target_type: TargetType;
  action: ActionType;
  metadata?: InteractionMetadata | null;
  created_at: number;
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  last_error?: string | null;
}

export interface QueueInteractionInput {
  user_id: string;
  interaction_type: InteractionType;
  target_id: string;
  target_type: TargetType;
  action: ActionType;
  metadata?: InteractionMetadata;
}

async function generateId(): Promise<string> {
  const uuid = await Crypto.randomUUID();
  return uuid;
}

/**
 * Add an interaction to the offline queue
 */
export async function addInteractionToQueue(input: QueueInteractionInput): Promise<string> {
  const db = await getDatabase();
  const id = await generateId();
  const created_at = Date.now();
  
  // Check if there's an existing pending interaction that would be cancelled out
  // e.g., if user likes then unlikes while offline, we can remove both
  if (input.interaction_type === 'like' || input.interaction_type === 'unlike') {
    const oppositeAction = input.action === 'add' ? 'remove' : 'add';
    const oppositeType = input.interaction_type === 'like' ? 'unlike' : 'like';
    
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM offline_interactions 
       WHERE user_id = ? AND target_id = ? AND target_type = ? 
       AND status = 'pending' 
       AND ((interaction_type = 'like' AND action = ?) OR (interaction_type = 'unlike' AND action = ?))`,
      [input.user_id, input.target_id, input.target_type, oppositeAction, oppositeAction]
    );
    
    if (existing) {
      // Cancel out the previous interaction
      await db.runAsync(`DELETE FROM offline_interactions WHERE id = ?`, [existing.id]);
      console.log(`[InteractionQueue] Cancelled out interaction: ${existing.id}`);
      return existing.id; // Return the cancelled ID
    }
  }
  
  // Similarly for follow/unfollow
  if (input.interaction_type === 'follow' || input.interaction_type === 'unfollow') {
    const oppositeType = input.interaction_type === 'follow' ? 'unfollow' : 'follow';
    
    const existing = await db.getFirstAsync<{ id: string }>(
      `SELECT id FROM offline_interactions 
       WHERE user_id = ? AND target_id = ? AND target_type = 'user'
       AND status = 'pending' AND interaction_type = ?`,
      [input.user_id, input.target_id, oppositeType]
    );
    
    if (existing) {
      await db.runAsync(`DELETE FROM offline_interactions WHERE id = ?`, [existing.id]);
      console.log(`[InteractionQueue] Cancelled out interaction: ${existing.id}`);
      return existing.id;
    }
  }
  
  await db.runAsync(
    `INSERT INTO offline_interactions (id, user_id, interaction_type, target_id, target_type, action, metadata, created_at, status, retry_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
    [
      id,
      input.user_id,
      input.interaction_type,
      input.target_id,
      input.target_type,
      input.action,
      input.metadata ? JSON.stringify(input.metadata) : null,
      created_at,
    ]
  );
  
  console.log(`[InteractionQueue] Added interaction to queue: ${id} - ${input.interaction_type} ${input.target_type}`);
  return id;
}

/**
 * Get all pending interactions
 */
export async function getPendingInteractions(): Promise<QueuedInteraction[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: string;
    user_id: string;
    interaction_type: string;
    target_id: string;
    target_type: string;
    action: string;
    metadata: string | null;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_interactions WHERE status = 'pending' ORDER BY created_at ASC`);
  
  return results.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    interaction_type: row.interaction_type as InteractionType,
    target_id: row.target_id,
    target_type: row.target_type as TargetType,
    action: row.action as ActionType,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    created_at: row.created_at,
    status: row.status as QueuedInteraction['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  }));
}

/**
 * Get count of pending interactions
 */
export async function getInteractionQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_interactions WHERE status = 'pending'`
  );
  return result?.count ?? 0;
}

/**
 * Remove an interaction from the queue
 */
export async function removeInteractionFromQueue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM offline_interactions WHERE id = ?`, [id]);
  console.log(`[InteractionQueue] Removed interaction from queue: ${id}`);
}

/**
 * Update interaction status
 */
export async function updateInteractionStatus(
  id: string,
  status: QueuedInteraction['status'],
  error?: string
): Promise<void> {
  const db = await getDatabase();
  
  if (error) {
    await db.runAsync(
      `UPDATE offline_interactions SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [status, error, id]
    );
  } else {
    await db.runAsync(`UPDATE offline_interactions SET status = ? WHERE id = ?`, [status, id]);
  }
  
  console.log(`[InteractionQueue] Updated interaction status: ${id} -> ${status}`);
}

/**
 * Mark interaction as processing
 */
export async function markInteractionAsProcessing(id: string): Promise<void> {
  await updateInteractionStatus(id, 'processing');
}

/**
 * Mark interaction as failed
 */
export async function markInteractionAsFailed(id: string, error: string): Promise<void> {
  await updateInteractionStatus(id, 'failed', error);
}

/**
 * Reset failed interactions for retry
 */
export async function resetFailedInteractions(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_interactions SET status = 'pending' WHERE status = 'failed' AND retry_count < 5`
  );
  console.log('[InteractionQueue] Reset failed interactions for retry');
}

/**
 * Clear all interactions
 */
export async function clearInteractionQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM offline_interactions`);
  console.log('[InteractionQueue] Interaction queue cleared');
}

/**
 * Check if a specific interaction is pending (for optimistic UI)
 */
export async function hasPendingInteraction(
  userId: string,
  targetId: string,
  targetType: TargetType,
  interactionType: InteractionType
): Promise<boolean> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_interactions 
     WHERE user_id = ? AND target_id = ? AND target_type = ? 
     AND interaction_type = ? AND status = 'pending'`,
    [userId, targetId, targetType, interactionType]
  );
  return (result?.count ?? 0) > 0;
}

/**
 * Get pending like state for a target (for optimistic UI)
 * Returns: 'liked' | 'unliked' | null (null means no pending change)
 */
export async function getPendingLikeState(
  userId: string,
  targetId: string,
  targetType: TargetType
): Promise<'liked' | 'unliked' | null> {
  const db = await getDatabase();
  
  // Get the most recent pending like/unlike for this target
  const result = await db.getFirstAsync<{ interaction_type: string; action: string }>(
    `SELECT interaction_type, action FROM offline_interactions 
     WHERE user_id = ? AND target_id = ? AND target_type = ? 
     AND interaction_type IN ('like', 'unlike') AND status = 'pending'
     ORDER BY created_at DESC LIMIT 1`,
    [userId, targetId, targetType]
  );
  
  if (!result) return null;
  
  if (result.interaction_type === 'like' && result.action === 'add') return 'liked';
  if (result.interaction_type === 'unlike' || result.action === 'remove') return 'unliked';
  
  return null;
}
