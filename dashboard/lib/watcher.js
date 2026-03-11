'use strict';

const fs = require('fs');
const path = require('path');
const { DEBOUNCE_MS } = require('./constants');

/**
 * Tails a JSONL file from a byte offset, emitting new lines.
 */
class JsonlTailer {
  constructor(filePath, onLines) {
    this.filePath = filePath;
    this.onLines = onLines;
    this.offset = 0;
    this.watcher = null;
    this._debounceTimer = null;
  }

  start() {
    // Read existing content first
    this._readNew();

    try {
      this.watcher = fs.watch(this.filePath, () => {
        this._debouncedRead();
      });
      this.watcher.on('error', () => this.stop());
    } catch {
      // File might not exist yet
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }
  }

  _debouncedRead() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._readNew(), DEBOUNCE_MS);
  }

  _readNew() {
    try {
      const stat = fs.statSync(this.filePath);
      if (stat.size <= this.offset) return;

      const fd = fs.openSync(this.filePath, 'r');
      const buf = Buffer.alloc(stat.size - this.offset);
      fs.readSync(fd, buf, 0, buf.length, this.offset);
      fs.closeSync(fd);

      this.offset = stat.size;

      const text = buf.toString('utf8');
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length > 0) {
        this.onLines(lines);
      }
    } catch {
      // File may have been deleted or rotated
    }
  }
}

/**
 * Watches a directory for new/changed JSONL files.
 */
class DirectoryWatcher {
  constructor(dirPath, onNewFile, onFileChange) {
    this.dirPath = dirPath;
    this.onNewFile = onNewFile;
    this.onFileChange = onFileChange;
    this.watcher = null;
    this.knownFiles = new Set();
    this._debounceTimers = {};
  }

  start() {
    if (!fs.existsSync(this.dirPath)) return;

    // Scan existing files
    try {
      const files = fs.readdirSync(this.dirPath);
      for (const f of files) {
        this.knownFiles.add(f);
      }
    } catch {
      return;
    }

    try {
      this.watcher = fs.watch(this.dirPath, (eventType, filename) => {
        if (!filename) return;

        if (this._debounceTimers[filename]) {
          clearTimeout(this._debounceTimers[filename]);
        }
        this._debounceTimers[filename] = setTimeout(() => {
          delete this._debounceTimers[filename];
          const fullPath = path.join(this.dirPath, filename);
          if (!fs.existsSync(fullPath)) return;

          if (!this.knownFiles.has(filename)) {
            this.knownFiles.add(filename);
            this.onNewFile(fullPath, filename);
          } else {
            this.onFileChange(fullPath, filename);
          }
        }, DEBOUNCE_MS);
      });
      this.watcher.on('error', () => this.stop());
    } catch {
      // Directory may not exist
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    for (const t of Object.values(this._debounceTimers)) {
      clearTimeout(t);
    }
    this._debounceTimers = {};
  }
}

/**
 * Watches a single JSON file for changes.
 */
class FileWatcher {
  constructor(filePath, onChange) {
    this.filePath = filePath;
    this.onChange = onChange;
    this.watcher = null;
    this._debounceTimer = null;
  }

  start() {
    if (!fs.existsSync(this.filePath)) return;

    // Initial read
    this._read();

    try {
      this.watcher = fs.watch(this.filePath, () => {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => this._read(), DEBOUNCE_MS);
      });
      this.watcher.on('error', () => this.stop());
    } catch {
      // File may not exist
    }
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
  }

  _read() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      this.onChange(content);
    } catch {
      // File may be temporarily unavailable
    }
  }
}

module.exports = { JsonlTailer, DirectoryWatcher, FileWatcher };
