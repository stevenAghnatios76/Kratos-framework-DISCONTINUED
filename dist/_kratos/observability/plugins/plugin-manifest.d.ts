export interface PluginDefinition {
    name: string;
    version: string;
    type: 'agent' | 'workflow' | 'skill' | 'task' | 'hook';
    description: string;
    entry: string;
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
export declare class PluginManifest {
    private configPath;
    private config;
    constructor(configPath: string);
    /**
     * Load plugins.yaml configuration.
     */
    load(): PluginsConfig;
    /**
     * Save plugins.yaml configuration.
     */
    save(): void;
    /**
     * Get all plugin definitions.
     */
    getPlugins(): PluginDefinition[];
    /**
     * Get a specific plugin by name.
     */
    getPlugin(name: string): PluginDefinition | undefined;
    /**
     * Add or update a plugin definition.
     */
    upsertPlugin(plugin: PluginDefinition): void;
    /**
     * Remove a plugin definition.
     */
    removePlugin(name: string): boolean;
    /**
     * Enable or disable a plugin.
     */
    setEnabled(name: string, enabled: boolean): boolean;
    /**
     * Get the resolved plugins directory path.
     */
    getPluginsDir(): string;
    /**
     * Check if auto-discovery is enabled.
     */
    isAutoDiscover(): boolean;
}
