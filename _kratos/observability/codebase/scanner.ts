// Kratos Codebase Scanner
// Incremental file scanner with checksums, imports, and dependency graph.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
import { MetricsCollector } from '../metrics/collector.js';

interface FileInfo {
  path: string;
  size: number;
  lines: number;
  checksum: string;
  language: string;
  imports: string[];
  last_modified: string;
}

interface ScanResult {
  total_files: number;
  changed_files: number;
  new_files: number;
  deleted_files: number;
  files: FileInfo[];
  by_language: Record<string, number>;
  total_lines: number;
  scan_duration_ms: number;
}

// Map of file extensions to language names
const LANG_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript',
  '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.json': 'JSON',
  '.md': 'Markdown',
  '.sql': 'SQL',
  '.css': 'CSS', '.scss': 'SCSS',
  '.html': 'HTML',
  '.xml': 'XML',
  '.sh': 'Shell',
};

export class CodebaseScanner {
  private projectRoot: string;
  private collector: MetricsCollector;
  private checksumCache: Map<string, string> = new Map();

  constructor(manager: MemoryManager, projectRoot: string) {
    this.projectRoot = projectRoot;
    this.collector = new MetricsCollector(manager);
    this.loadChecksumCache();
  }

  /**
   * Run incremental scan using git diff for change detection.
   */
  scan(): ScanResult {
    const startTime = Date.now();
    const changedPaths = this.getChangedFiles();
    const allFiles = this.getAllTrackedFiles();

    const files: FileInfo[] = [];
    let new_files = 0;
    let changed_files = 0;
    let deleted_files = 0;
    const by_language: Record<string, number> = {};

    for (const filePath of allFiles) {
      const absPath = path.join(this.projectRoot, filePath);
      if (!fs.existsSync(absPath)) continue;

      const stat = fs.statSync(absPath);
      if (stat.isDirectory()) continue;

      const ext = path.extname(filePath);
      const language = LANG_MAP[ext] || 'Other';
      by_language[language] = (by_language[language] || 0) + 1;

      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split('\n').length;
      const checksum = this.computeChecksum(content);
      const imports = this.extractImports(content, ext);

      const oldChecksum = this.checksumCache.get(filePath);
      if (!oldChecksum) {
        new_files++;
      } else if (oldChecksum !== checksum) {
        changed_files++;
      }

      this.checksumCache.set(filePath, checksum);

      files.push({
        path: filePath,
        size: stat.size,
        lines,
        checksum,
        language,
        imports,
        last_modified: stat.mtime.toISOString(),
      });
    }

    // Detect deleted files
    for (const cached of this.checksumCache.keys()) {
      if (!allFiles.includes(cached)) {
        deleted_files++;
        this.checksumCache.delete(cached);
      }
    }

    this.saveChecksumCache();

    const total_lines = files.reduce((sum, f) => sum + f.lines, 0);
    const scan_duration_ms = Date.now() - startTime;

    const result: ScanResult = {
      total_files: files.length,
      changed_files,
      new_files,
      deleted_files,
      files,
      by_language,
      total_lines,
      scan_duration_ms,
    };

    // Record metrics
    this.collector.recordBatch([
      { metric_type: 'quality', metric_name: 'codebase_files', value: result.total_files, unit: 'files' },
      { metric_type: 'quality', metric_name: 'codebase_lines', value: result.total_lines, unit: 'lines' },
      { metric_type: 'quality', metric_name: 'scan_changes', value: result.changed_files, unit: 'files' },
    ]);

    return result;
  }

  /**
   * Get stats summary without full file list.
   */
  getStats(): { total_files: number; total_lines: number; by_language: Record<string, number> } {
    const result = this.scan();
    return {
      total_files: result.total_files,
      total_lines: result.total_lines,
      by_language: result.by_language,
    };
  }

  /**
   * Format scan result for console display.
   */
  formatReport(result: ScanResult): string {
    const lines: string[] = [
      'Codebase Scan Report',
      '='.repeat(50),
      '',
      `Total files:     ${result.total_files}`,
      `Total lines:     ${result.total_lines.toLocaleString()}`,
      `Changed files:   ${result.changed_files}`,
      `New files:       ${result.new_files}`,
      `Deleted files:   ${result.deleted_files}`,
      `Scan time:       ${result.scan_duration_ms}ms`,
      '',
      'By Language:',
    ];

    const sorted = Object.entries(result.by_language).sort((a, b) => b[1] - a[1]);
    for (const [lang, count] of sorted) {
      lines.push(`  ${lang}: ${count} files`);
    }

    return lines.join('\n');
  }

  private getChangedFiles(): string[] {
    try {
      const output = execSync('git diff --name-only HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private getAllTrackedFiles(): string[] {
    try {
      const output = execSync('git ls-files', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  private computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private extractImports(content: string, ext: string): string[] {
    const imports: string[] = [];
    if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
      const regex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (ext === '.py') {
      const regex = /(?:from|import)\s+([\w.]+)/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    }
    return imports;
  }

  private loadChecksumCache(): void {
    const cachePath = path.join(this.projectRoot, '_kratos', '.cache', 'checksums.json');
    if (fs.existsSync(cachePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        this.checksumCache = new Map(Object.entries(data));
      } catch { /* ignore corrupt cache */ }
    }
  }

  private saveChecksumCache(): void {
    const cachePath = path.join(this.projectRoot, '_kratos', '.cache', 'checksums.json');
    const dir = path.dirname(cachePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, string> = {};
    for (const [k, v] of this.checksumCache) {
      obj[k] = v;
    }
    fs.writeFileSync(cachePath, JSON.stringify(obj, null, 2));
  }
}
