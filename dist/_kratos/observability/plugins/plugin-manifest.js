"use strict";
// Kratos Plugin Manifest
// Reads and writes the plugins.yaml configuration.
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
exports.PluginManifest = void 0;
const fs = __importStar(require("fs"));
const yaml = __importStar(require("yaml"));
const DEFAULT_CONFIG = {
    plugins_dir: '{installed_path}/plugins',
    auto_discover: true,
    plugins: [],
};
class PluginManifest {
    configPath;
    config;
    constructor(configPath) {
        this.configPath = configPath;
        this.config = { ...DEFAULT_CONFIG };
    }
    /**
     * Load plugins.yaml configuration.
     */
    load() {
        if (fs.existsSync(this.configPath)) {
            try {
                const raw = fs.readFileSync(this.configPath, 'utf-8');
                const parsed = yaml.parse(raw);
                this.config = { ...DEFAULT_CONFIG, ...parsed, plugins: parsed.plugins || [] };
            }
            catch {
                this.config = { ...DEFAULT_CONFIG };
            }
        }
        return this.config;
    }
    /**
     * Save plugins.yaml configuration.
     */
    save() {
        const dir = require('path').dirname(this.configPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, yaml.stringify(this.config), 'utf-8');
    }
    /**
     * Get all plugin definitions.
     */
    getPlugins() {
        return this.config.plugins;
    }
    /**
     * Get a specific plugin by name.
     */
    getPlugin(name) {
        return this.config.plugins.find(p => p.name === name);
    }
    /**
     * Add or update a plugin definition.
     */
    upsertPlugin(plugin) {
        const idx = this.config.plugins.findIndex(p => p.name === plugin.name);
        if (idx >= 0) {
            this.config.plugins[idx] = plugin;
        }
        else {
            this.config.plugins.push(plugin);
        }
        this.save();
    }
    /**
     * Remove a plugin definition.
     */
    removePlugin(name) {
        const idx = this.config.plugins.findIndex(p => p.name === name);
        if (idx >= 0) {
            this.config.plugins.splice(idx, 1);
            this.save();
            return true;
        }
        return false;
    }
    /**
     * Enable or disable a plugin.
     */
    setEnabled(name, enabled) {
        const plugin = this.config.plugins.find(p => p.name === name);
        if (plugin) {
            plugin.enabled = enabled;
            this.save();
            return true;
        }
        return false;
    }
    /**
     * Get the resolved plugins directory path.
     */
    getPluginsDir() {
        return this.config.plugins_dir;
    }
    /**
     * Check if auto-discovery is enabled.
     */
    isAutoDiscover() {
        return this.config.auto_discover;
    }
}
exports.PluginManifest = PluginManifest;
//# sourceMappingURL=plugin-manifest.js.map