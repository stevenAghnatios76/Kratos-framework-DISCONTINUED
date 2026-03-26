"use strict";
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
exports.CheckpointManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const yaml = __importStar(require("yaml"));
class CheckpointManager {
    checkpointDir;
    constructor(checkpointDir) {
        this.checkpointDir = checkpointDir;
    }
    async write(checkpoint) {
        if (!fs.existsSync(this.checkpointDir)) {
            fs.mkdirSync(this.checkpointDir, { recursive: true });
        }
        // Compute checksums for files_touched
        for (const file of checkpoint.files_touched) {
            if (fs.existsSync(file.path)) {
                const content = fs.readFileSync(file.path);
                file.checksum = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
                const stat = fs.statSync(file.path);
                file.last_modified = stat.mtime.toISOString();
            }
        }
        checkpoint.created_at = new Date().toISOString();
        const timestamp = Date.now();
        const fileName = `${checkpoint.workflow}-step-${checkpoint.step}-${timestamp}.yaml`;
        const filePath = path.join(this.checkpointDir, fileName);
        fs.writeFileSync(filePath, yaml.stringify(checkpoint), 'utf-8');
        return filePath;
    }
    async getLatest(workflow) {
        if (!fs.existsSync(this.checkpointDir))
            return null;
        const files = fs.readdirSync(this.checkpointDir)
            .filter(f => f.startsWith(workflow) && f.endsWith('.yaml'))
            .sort()
            .reverse();
        if (files.length === 0)
            return null;
        const content = fs.readFileSync(path.join(this.checkpointDir, files[0]), 'utf-8');
        return yaml.parse(content);
    }
    async validate(checkpoint) {
        const changed_files = [];
        const missing_files = [];
        for (const file of checkpoint.files_touched) {
            if (!fs.existsSync(file.path)) {
                missing_files.push(file.path);
                continue;
            }
            const content = fs.readFileSync(file.path);
            const currentChecksum = `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
            if (currentChecksum !== file.checksum) {
                changed_files.push(file.path);
            }
        }
        return {
            valid: changed_files.length === 0 && missing_files.length === 0,
            changed_files,
            missing_files,
        };
    }
    async archive(checkpointPath) {
        const completedDir = path.join(this.checkpointDir, 'completed');
        if (!fs.existsSync(completedDir)) {
            fs.mkdirSync(completedDir, { recursive: true });
        }
        const fileName = path.basename(checkpointPath);
        const destPath = path.join(completedDir, fileName);
        fs.renameSync(checkpointPath, destPath);
    }
    async listActive() {
        if (!fs.existsSync(this.checkpointDir))
            return [];
        const files = fs.readdirSync(this.checkpointDir)
            .filter(f => f.endsWith('.yaml') && !f.startsWith('upgrade-'));
        const checkpoints = [];
        for (const file of files) {
            try {
                const content = fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8');
                const cp = yaml.parse(content);
                if (cp.status === 'active') {
                    checkpoints.push(cp);
                }
            }
            catch {
                // Skip invalid checkpoint files
            }
        }
        return checkpoints;
    }
    async cleanup(maxAgeDays) {
        const completedDir = path.join(this.checkpointDir, 'completed');
        if (!fs.existsSync(completedDir))
            return 0;
        const cutoff = Date.now() - maxAgeDays * 86400000;
        const files = fs.readdirSync(completedDir);
        let removed = 0;
        for (const file of files) {
            const filePath = path.join(completedDir, file);
            const stat = fs.statSync(filePath);
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(filePath);
                removed++;
            }
        }
        return removed;
    }
}
exports.CheckpointManager = CheckpointManager;
//# sourceMappingURL=checkpoint-manager.js.map