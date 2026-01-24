import { getDatabase } from './db';
import * as Crypto from 'expo-crypto';

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
  created_at: number;
  status: 'pending' | 'processing' | 'failed';
  retry_count: number;
  last_error?: string | null;
}

export interface QueueRequestInput {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  payload?: Record<string, unknown> | null;
  headers?: Record<string, string> | null;
}

export async function generateId(): Promise<string> {
  const uuid = await Crypto.randomUUID();
  return uuid;
}

export async function addToQueue(request: QueueRequestInput): Promise<string> {
  const db = await getDatabase();
  const id = await generateId();
  const created_at = Date.now();

  await db.runAsync(
    `INSERT INTO offline_queue (id, endpoint, method, payload, headers, created_at, status, retry_count)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', 0)`,
    [
      id,
      request.endpoint,
      request.method,
      request.payload ? JSON.stringify(request.payload) : null,
      request.headers ? JSON.stringify(request.headers) : null,
      created_at,
    ]
  );

  console.log(`[Queue] Added request to queue: ${id} - ${request.method} ${request.endpoint}`);
  return id;
}

export async function getQueue(): Promise<QueuedRequest[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: string;
    endpoint: string;
    method: string;
    payload: string | null;
    headers: string | null;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_queue WHERE status = 'pending' ORDER BY created_at ASC`);

  return results.map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    method: row.method as QueuedRequest['method'],
    payload: row.payload ? JSON.parse(row.payload) : null,
    headers: row.headers ? JSON.parse(row.headers) : null,
    created_at: row.created_at,
    status: row.status as QueuedRequest['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  }));
}

export async function getQueueCount(): Promise<number> {
  const db = await getDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM offline_queue WHERE status = 'pending'`
  );
  return result?.count ?? 0;
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM offline_queue WHERE id = ?`, [id]);
  console.log(`[Queue] Removed request from queue: ${id}`);
}

export async function updateQueueItemStatus(
  id: string,
  status: QueuedRequest['status'],
  error?: string
): Promise<void> {
  const db = await getDatabase();

  if (error) {
    await db.runAsync(
      `UPDATE offline_queue SET status = ?, last_error = ?, retry_count = retry_count + 1 WHERE id = ?`,
      [status, error, id]
    );
  } else {
    await db.runAsync(`UPDATE offline_queue SET status = ? WHERE id = ?`, [status, id]);
  }

  console.log(`[Queue] Updated request status: ${id} -> ${status}`);
}

export async function markAsProcessing(id: string): Promise<void> {
  await updateQueueItemStatus(id, 'processing');
}

export async function markAsFailed(id: string, error: string): Promise<void> {
  await updateQueueItemStatus(id, 'failed', error);
}

export async function resetFailedItems(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE offline_queue SET status = 'pending' WHERE status = 'failed' AND retry_count < 5`
  );
  console.log('[Queue] Reset failed items for retry');
}

export async function clearQueue(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM offline_queue`);
  console.log('[Queue] Queue cleared');
}

export async function getFailedItems(): Promise<QueuedRequest[]> {
  const db = await getDatabase();
  const results = await db.getAllAsync<{
    id: string;
    endpoint: string;
    method: string;
    payload: string | null;
    headers: string | null;
    created_at: number;
    status: string;
    retry_count: number;
    last_error: string | null;
  }>(`SELECT * FROM offline_queue WHERE status = 'failed' ORDER BY created_at ASC`);

  return results.map((row) => ({
    id: row.id,
    endpoint: row.endpoint,
    method: row.method as QueuedRequest['method'],
    payload: row.payload ? JSON.parse(row.payload) : null,
    headers: row.headers ? JSON.parse(row.headers) : null,
    created_at: row.created_at,
    status: row.status as QueuedRequest['status'],
    retry_count: row.retry_count,
    last_error: row.last_error,
  }));
}
