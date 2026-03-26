// Kratos Plugin Manifest
// Reads and writes the plugins.yaml configuration.

import * as fs from 'fs';
import * as yaml from 'yaml';

export interface PluginDefinition {
  name: string;
  version: string;
  type: 'agent' | 'workflow' | 'skill' | 'task' | 'hook';
  description: string;
  entry: string;          // Relative path to entry file
  enabled: boolean;
  author?: string;
  dependencies?: string[];
  config?: Record<string, unknown>;
}

export interface PluginsConfig {
  plugins_dir: string;
  auto_discover: boolean;
  plugins: PluginDefinition[];
}

const DEFAULT_CONFIG: PluginsConfig = {
  plugins_dir: '{installed_path}/plugins',
  auto_discover: true,
  plugins: [],
};

export class PluginManifest {
  private configPath: string;
  private config: PluginsConfig;

  constructor(configPath: string) {
    this.configPath = configPath;
    this.config = { ...DEFAULT_CONFIG };
  }

  /**
   * Load plugins.yaml configuration.
   */
  load(): PluginsConfig {
    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = yaml.parse(raw) as Partial<PluginsConfig>;
        this.config = { ...DEFAULT_CONFIG, ...parsed, plugins: parsed.plugins || [] };
      } catch {
        this.config = { ...DEFAULT_CONFIG };
      }
    }
    return this.config;
  }

  /**
   * Save plugins.yaml configuration.
   */
  save(): void {
    const dir = require('path').dirname(this.configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configPath, yaml.stringify(this.config), 'utf-8');
  }

  /**
   * Get all plugin definitions.
   */
  getPlugins(): PluginDefinition[] {
    return this.config.plugins;
  }

  /**
   * Get a specific plugin by name.
   */
  getPlugin(name: string): PluginDefinition | undefined {
    return this.config.plugins.find(p => p.name === name);
  }

  /**
   * Add or update a plugin definition.
   */
  upsertPlugin(plugin: PluginDefinition): void {
    const idx = this.config.plugins.findIndex(p => p.name === plugin.name);
    if (idx >= 0) {
      this.config.plugins[idx] = plugin;
    } else {
      this.config.plugins.push(plugin);
    }
    this.save();
  }

  /**
   * Remove a plugin definition.
   */
  removePlugin(name: string): boolean {
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
  setEnabled(name: string, enabled: boolean): boolean {
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
  getPluginsDir(): string {
    return this.config.plugins_dir;
  }

  /**
   * Check if auto-discovery is enabled.
   */
  isAutoDiscover(): boolean {
    return this.config.auto_discover;
  }
}
