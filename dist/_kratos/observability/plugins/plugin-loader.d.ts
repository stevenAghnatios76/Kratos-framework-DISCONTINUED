import { PluginManifest, type PluginDefinition } from './plugin-manifest.js';
interface DiscoveredPlugin {
    name: string;
    type: PluginDefinition['type'];
    path: string;
    has_manifest: boolean;
    manifest?: Partial<PluginDefinition>;
}
interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export declare class PluginLoader {
    private pluginsDir;
    private manifest;
    constructor(pluginsDir: string, manifest: PluginManifest);
    /**
     * Discover plugins in the plugins directory.
     */
    discover(): DiscoveredPlugin[];
    /**
     * Validate a plugin definition.
     */
    validate(plugin: PluginDefinition): ValidationResult;
    /**
     * Create a plugin scaffold.
     */
    createScaffold(name: string, type: PluginDefinition['type']): string;
    private getEntryFilename;
    private getEntryTemplate;
}
export {};
