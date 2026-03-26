"use strict";
// Kratos Plugin Loader
// Plugin discovery and loading from the plugins directory.
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
exports.PluginLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("yaml"));
const PLUGIN_TYPES = ['agent', 'workflow', 'skill', 'task', 'hook'];
const TYPE_DIR_MAP = {
    agent: 'agents',
    workflow: 'workflows',
    skill: 'skills',
    task: 'tasks',
    hook: 'hooks',
};
class PluginLoader {
    pluginsDir;
    manifest;
    constructor(pluginsDir, manifest) {
        this.pluginsDir = pluginsDir;
        this.manifest = manifest;
    }
    /**
     * Discover plugins in the plugins directory.
     */
    discover() {
        const discovered = [];
        for (const type of PLUGIN_TYPES) {
            const typeDir = path.join(this.pluginsDir, TYPE_DIR_MAP[type]);
            if (!fs.existsSync(typeDir))
                continue;
            const entries = fs.readdirSync(typeDir);
            for (const entry of entries) {
                if (entry === '.gitkeep')
                    continue;
                const entryPath = path.join(typeDir, entry);
                const stat = fs.statSync(entryPath);
                if (stat.isDirectory()) {
                    // Directory plugin — look for plugin.yaml
                    const manifestPath = path.join(entryPath, 'plugin.yaml');
                    const has_manifest = fs.existsSync(manifestPath);
                    let manifest;
                    if (has_manifest) {
                        try {
                            manifest = yaml.parse(fs.readFileSync(manifestPath, 'utf-8'));
                        }
                        catch { /* skip corrupt manifests */ }
                    }
                    discovered.push({
                        name: manifest?.name || entry,
                        type,
                        path: entryPath,
                        has_manifest,
                        manifest,
                    });
                }
                else if (entry.endsWith('.md') || entry.endsWith('.yaml') || entry.endsWith('.ts')) {
                    // Single-file plugin
                    discovered.push({
                        name: path.basename(entry, path.extname(entry)),
                        type,
                        path: entryPath,
                        has_manifest: false,
                    });
                }
            }
        }
        return discovered;
    }
    /**
     * Validate a plugin definition.
     */
    validate(plugin) {
        const errors = [];
        const warnings = [];
        if (!plugin.name || plugin.name.trim().length === 0) {
            errors.push('Plugin name is required');
        }
        if (!plugin.type || !PLUGIN_TYPES.includes(plugin.type)) {
            errors.push(`Invalid plugin type: ${plugin.type}. Must be one of: ${PLUGIN_TYPES.join(', ')}`);
        }
        if (!plugin.version) {
            warnings.push('No version specified, defaulting to 1.0.0');
        }
        if (!plugin.entry) {
            errors.push('Entry point is required');
        }
        else {
            const typeDir = TYPE_DIR_MAP[plugin.type];
            const entryPath = path.join(this.pluginsDir, typeDir, plugin.entry);
            if (!fs.existsSync(entryPath)) {
                errors.push(`Entry point not found: ${entryPath}`);
            }
        }
        if (!plugin.description) {
            warnings.push('No description provided');
        }
        // Check dependencies
        if (plugin.dependencies) {
            for (const dep of plugin.dependencies) {
                const depPlugin = this.manifest.getPlugin(dep);
                if (!depPlugin) {
                    errors.push(`Dependency not found: ${dep}`);
                }
                else if (!depPlugin.enabled) {
                    warnings.push(`Dependency ${dep} is disabled`);
                }
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    /**
     * Create a plugin scaffold.
     */
    createScaffold(name, type) {
        const typeDir = TYPE_DIR_MAP[type];
        const pluginDir = path.join(this.pluginsDir, typeDir, name);
        if (fs.existsSync(pluginDir)) {
            throw new Error(`Plugin directory already exists: ${pluginDir}`);
        }
        fs.mkdirSync(pluginDir, { recursive: true });
        // Create plugin.yaml
        const manifest = {
            name,
            version: '1.0.0',
            type,
            description: `${name} plugin`,
            entry: `${name}/${this.getEntryFilename(type)}`,
            enabled: false,
            author: '',
        };
        fs.writeFileSync(path.join(pluginDir, 'plugin.yaml'), yaml.stringify(manifest), 'utf-8');
        // Create entry file
        const entryContent = this.getEntryTemplate(name, type);
        const entryFile = this.getEntryFilename(type);
        fs.writeFileSync(path.join(pluginDir, entryFile), entryContent, 'utf-8');
        return pluginDir;
    }
    getEntryFilename(type) {
        switch (type) {
            case 'agent': return 'agent.md';
            case 'workflow': return 'workflow.yaml';
            case 'skill': return 'skill.md';
            case 'task': return 'task.md';
            case 'hook': return 'hook.sh';
        }
    }
    getEntryTemplate(name, type) {
        switch (type) {
            case 'agent':
                return `# ${name}\n\n<agent>\n  <id>${name}</id>\n  <role>Custom agent</role>\n  <goal>Describe the agent's purpose</goal>\n</agent>\n`;
            case 'workflow':
                return `name: ${name}\ndescription: Custom workflow\nsteps:\n  - name: step-1\n    instruction: "Describe step 1"\n`;
            case 'skill':
                return `# ${name} Skill\n\n## Usage\nDescribe when to use this skill.\n\n## Instructions\n1. Step one\n2. Step two\n`;
            case 'task':
                return `# ${name} Task\n\n## Description\nDescribe the task.\n\n## Steps\n1. Step one\n2. Step two\n`;
            case 'hook':
                return `#!/bin/bash\n# ${name} hook\n# Triggered by lifecycle events\n\necho "Running ${name} hook"\n`;
        }
    }
}
exports.PluginLoader = PluginLoader;
//# sourceMappingURL=plugin-loader.js.map