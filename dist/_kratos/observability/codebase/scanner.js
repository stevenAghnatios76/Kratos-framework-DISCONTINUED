"use strict";
// Kratos Codebase Scanner
// Incremental file scanner with checksums, imports, and dependency graph.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodebaseScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const collector_js_1 = require("../metrics/collector.js");
// Map of file extensions to language names
const LANG_MAP = {
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
class CodebaseScanner {
    projectRoot;
    collector;
    checksumCache = new Map();
    constructor(manager, projectRoot) {
        this.projectRoot = projectRoot;
        this.collector = new collector_js_1.MetricsCollector(manager);
        this.loadChecksumCache();
    }
    /**
     * Run incremental scan using git diff for change detection.
     */
    scan() {
        const startTime = Date.now();
        const changedPaths = this.getChangedFiles();
        const allFiles = this.getAllTrackedFiles();
        const files = [];
        let new_files = 0;
        let changed_files = 0;
        let deleted_files = 0;
        const by_language = {};
        for (const filePath of allFiles) {
            const absPath = path.join(this.projectRoot, filePath);
            if (!fs.existsSync(absPath))
                continue;
            const stat = fs.statSync(absPath);
            if (stat.isDirectory())
                continue;
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
            }
            else if (oldChecksum !== checksum) {
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
        const result = {
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
    getStats() {
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
    formatReport(result) {
        const lines = [
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
    getChangedFiles() {
        try {
            const output = (0, child_process_1.execSync)('git diff --name-only HEAD', {
                cwd: this.projectRoot,
                encoding: 'utf-8',
                timeout: 10000,
            });
            return output.trim().split('\n').filter(Boolean);
        }
        catch {
            return [];
        }
    }
    getAllTrackedFiles() {
        try {
            const output = (0, child_process_1.execSync)('git ls-files', {
                cwd: this.projectRoot,
                encoding: 'utf-8',
                timeout: 10000,
            });
            return output.trim().split('\n').filter(Boolean);
        }
        catch {
            return [];
        }
    }
    computeChecksum(content) {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }
    extractImports(content, ext) {
        const imports = [];
        if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
            const regex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }
        else if (ext === '.py') {
            const regex = /(?:from|import)\s+([\w.]+)/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
                imports.push(match[1]);
            }
        }
        return imports;
    }
    loadChecksumCache() {
        const cachePath = path.join(this.projectRoot, '_kratos', '.cache', 'checksums.json');
        if (fs.existsSync(cachePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
                this.checksumCache = new Map(Object.entries(data));
            }
            catch { /* ignore corrupt cache */ }
        }
    }
    saveChecksumCache() {
        const cachePath = path.join(this.projectRoot, '_kratos', '.cache', 'checksums.json');
        const dir = path.dirname(cachePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        const obj = {};
        for (const [k, v] of this.checksumCache) {
            obj[k] = v;
        }
        fs.writeFileSync(cachePath, JSON.stringify(obj, null, 2));
    }
}
exports.CodebaseScanner = CodebaseScanner;
//# sourceMappingURL=scanner.js.map