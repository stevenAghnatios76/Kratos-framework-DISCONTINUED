import { PluginManifest, type PluginDefinition } from './plugin-manifest.js';
import { PluginLoader } from './plugin-loader.js';
interface PluginStatus {
    name: string;
    type: PluginDefinition['type'];
    version: string;
    enabled: boolean;
    installed: boolean;
    valid: boolean;
    errors: string[];
}
export declare class PluginRegistry {
    private manifest;
    private loader;
    constructor(manifest: PluginManifest, loader: PluginLoader);
    /**
     * List all registered plugins with their status.
     */
    listAll(): PluginStatus[];
    /**
     * Discover unregistered plugins and return combined list.
     */
    discoverAndList(): PluginStatus[];
    /**
     * Enable a plugin by name.
     */
    enable(name: string): {
        success: boolean;
        message: string;
    };
    /**
     * Disable a plugin by name.
     */
    disable(name: string): {
        success: boolean;
        message: string;
    };
    /**
     * Create a new plugin scaffold and register it.
     */
    create(name: string, type: PluginDefinition['type']): {
        success: boolean;
        path: string;
        message: string;
    };
    /**
     * Format plugin list for console display.
     */
    formatList(plugins: PluginStatus[]): string;
}
export {};
