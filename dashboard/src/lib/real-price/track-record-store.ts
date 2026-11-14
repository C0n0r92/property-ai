/**
 * Loads the track record the pipeline works out each night
 * (pipeline/src/build-track-record.ts) and hands it to track-record.ts, so
 * the web server never computes it. Web only: the pipeline has no use for it.
 */
import { getPool } from './pool';
import { setStoredTrackRecord, type TrackRecord } from './track-record';

/** Read the stored record; keeps the current one if the read fails. */
export async function loadStoredTrackRecord(): Promise<boolean> {
  const db = getPool();
  if (!db) return false;
  try {
    const { rows } = await db.query<{ record: TrackRecord }>('SELECT record FROM track_records WHERE id = 1');
    if (rows[0]?.record?.overall?.tested) {
      setStoredTrackRecord(rows[0].record);
      return true;
    }
  } catch {
    // The table arrives with its migration; until then the server works it out itself
  }
  return false;
}
