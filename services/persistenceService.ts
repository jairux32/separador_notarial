import { get, set, del } from 'idb-keyval';
import { ProcessedFile } from '../types';

const STATE_KEY = 'esprint_current_file';
const SETTINGS_KEY = 'esprint_settings';

export interface AppSettings {
    notaryCode: string;
    themeColor: 'violet' | 'blue' | 'emerald';
}

export const defaultSettings: AppSettings = {
    notaryCode: '1101007',
    themeColor: 'violet'
};

// --- DATA PERSISTENCE ---

/**
 * Saves the current processed file state to IndexedDB.
 * We remove the actual 'file' Blob if it is huge to avoid quota issues, 
 * or we accept that huge files might fail to save.
 * Ideally, we save metadata and ask user to re-upload PDF if missing.
 */
export const saveState = async (state: ProcessedFile | null) => {
    if (!state) {
        await del(STATE_KEY);
        return;
    }

    // Clone to avoid mutating original
    const stateToSave = { ...state };

    // Optimization: If file is > 50MB, don't save the blob in IDB to prevent crash.
    // We will prompt user to re-attach file on load.
    if (state.file && state.file.size > 50 * 1024 * 1024) {
        // We keep the name and other data, but remove the blob.
        // We need a flag to know we need reattachment.
        (stateToSave as any).file = null;
        (stateToSave as any).missingFile = true;
    }

    await set(STATE_KEY, stateToSave);
};

export const loadState = async (): Promise<ProcessedFile | null> => {
    return await get(STATE_KEY);
};

export const clearState = async () => {
    await del(STATE_KEY);
};

// --- SETTINGS ---

export const saveSettings = async (settings: AppSettings) => {
    await set(SETTINGS_KEY, settings);
};

export const loadSettings = async (): Promise<AppSettings> => {
    const s = await get(SETTINGS_KEY);
    return s || defaultSettings;
};
