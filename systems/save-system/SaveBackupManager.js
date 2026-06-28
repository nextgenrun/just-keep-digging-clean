/**
 * SaveBackupManager - Manages automatic backups of save data
 * Maintains rotating backups to prevent data loss
 */
export class SaveBackupManager {
  constructor(options = {}) {
    this.maxBackups = options.maxBackups || 5;
    this.backupPrefix = options.backupPrefix || 'dig-game-backup';
  }

  getBackupKey(slotId, backupIndex) {
    return `${this.backupPrefix}-slot-${slotId}-${backupIndex}`;
  }

  createBackup(slotId, saveData) {
    const timestamp = new Date().toISOString();
    const backupIndex = this._getNextBackupIndex(slotId);
    const backupKey = this.getBackupKey(slotId, backupIndex);

    const backup = {
      ...saveData,
      _backupMetadata: {
        originalTimestamp: saveData.updatedAt,
        backupTimestamp: timestamp,
        backupIndex: backupIndex,
        version: saveData.version || 1
      }
    };

    try {
      localStorage.setItem(backupKey, JSON.stringify(backup));
      return { success: true, backupIndex, timestamp };
    } catch (error) {
      console.error('[SaveBackupManager] Failed to create backup:', error);
      return { success: false, error: error.message };
    }
  }

  getBackups(slotId) {
    const backups = [];
    for (let i = 0; i < this.maxBackups; i++) {
      const backupKey = this.getBackupKey(slotId, i);
      try {
        const raw = localStorage.getItem(backupKey);
        if (raw) {
          const backup = JSON.parse(raw);
          backups.push({
            index: i,
            data: backup,
            timestamp: backup._backupMetadata?.backupTimestamp || backup.updatedAt,
            originalTimestamp: backup._backupMetadata?.originalTimestamp || backup.updatedAt
          });
        }
      } catch (error) {
        console.warn(`[SaveBackupManager] Failed to load backup ${i} for slot ${slotId}:`, error);
      }
    }
    return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getLatestBackup(slotId) {
    const backups = this.getBackups(slotId);
    return backups.length > 0 ? backups[0].data : null;
  }

  restoreBackup(slotId, backupIndex) {
    const backupKey = this.getBackupKey(slotId, backupIndex);
    try {
      const raw = localStorage.getItem(backupKey);
      if (!raw) {
        return { success: false, error: 'Backup not found' };
      }
      const backup = JSON.parse(raw);
      const { _backupMetadata, ...saveData } = backup;
      return { success: true, saveData, backupMetadata: _backupMetadata };
    } catch (error) {
      console.error('[SaveBackupManager] Failed to restore backup:', error);
      return { success: false, error: error.message };
    }
  }

  deleteBackup(slotId, backupIndex) {
    const backupKey = this.getBackupKey(slotId, backupIndex);
    try {
      localStorage.removeItem(backupKey);
      return true;
    } catch (error) {
      console.error('[SaveBackupManager] Failed to delete backup:', error);
      return false;
    }
  }

  deleteAllBackups(slotId) {
    let deleted = 0;
    for (let i = 0; i < this.maxBackups; i++) {
      if (this.deleteBackup(slotId, i)) deleted++;
    }
    return deleted;
  }

  calculateChecksum(saveData) {
    const str = JSON.stringify(saveData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  verifyChecksum(saveData, expectedChecksum) {
    return this.calculateChecksum(saveData) === expectedChecksum;
  }

  _getNextBackupIndex(slotId) {
    const backups = this.getBackups(slotId);
    if (backups.length === 0) return 0;
    const oldestBackup = backups[backups.length - 1];
    return (oldestBackup.index + 1) % this.maxBackups;
  }

  getBackupStats(slotId) {
    const backups = this.getBackups(slotId);
    return {
      totalBackups: backups.length,
      maxBackups: this.maxBackups,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].timestamp : null,
      newestBackup: backups.length > 0 ? backups[0].timestamp : null,
      totalSizeBytes: backups.reduce((sum, b) => sum + JSON.stringify(b.data).length, 0)
    };
  }
}