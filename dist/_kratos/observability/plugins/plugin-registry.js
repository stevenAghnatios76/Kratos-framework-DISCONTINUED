"use strict";
// Kratos Plugin Registry
// Plugin lifecycle management: enable, disable, and status tracking.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginRegistry = void 0;
class PluginRegistry {
    manifest;
    loader;
    constructor(manifest, loader) {
        this.manifest = manifest;
        this.loader = loader;
    }
    /**
     * List all registered plugins with their status.
     */
    listAll() {
        const plugins = this.manifest.getPlugins();
        return plugins.map(p => {
            const validation = this.loader.validate(p);
            return {
                name: p.name,
                type: p.type,
                version: p.version,
                enabled: p.enabled,
                installed: true,
                valid: validation.valid,
                errors: validation.errors,
            };
        });
    }
    /**
     * Discover unregistered plugins and return combined list.
     */
    discoverAndList() {
        const registered = this.listAll();
        const registeredNames = new Set(registered.map(p => p.name));
        const discovered = this.loader.discover();
        for (const disc of discovered) {
            if (!registeredNames.has(disc.name)) {
                registered.push({
                    name: disc.name,
                    type: disc.type,
                    version: disc.manifest?.version || '0.0.0',
                    enabled: false,
                    installed: true,
                    valid: disc.has_manifest,
                    errors: disc.has_manifest ? [] : ['No plugin.yaml manifest found'],
                });
            }
        }
        return registered;
    }
    /**
     * Enable a plugin by name.
     */
    enable(name) {
        const plugin = this.manifest.getPlugin(name);
        if (!plugin) {
            return { success: false, message: `Plugin not found: ${name}` };
        }
        const validation = this.loader.validate(plugin);
        if (!validation.valid) {
            return {
                success: false,
                message: `Plugin validation failed:\n${validation.errors.join('\n')}`,
            };
        }
        this.manifest.setEnabled(name, true);
        return { success: true, message: `Plugin ${name} enabled` };
    }
    /**
     * Disable a plugin by name.
     */
    disable(name) {
        const plugin = this.manifest.getPlugin(name);
        if (!plugin) {
            return { success: false, message: `Plugin not found: ${name}` };
        }
        // Check if other plugins depend on this one
        const dependents = this.manifest.getPlugins()
            .filter(p => p.enabled && p.dependencies?.includes(name));
        if (dependents.length > 0) {
            const names = dependents.map(p => p.name).join(', ');
            return {
                success: false,
                message: `Cannot disable ${name}: depended on by ${names}`,
            };
        }
        this.manifest.setEnabled(name, false);
        return { success: true, message: `Plugin ${name} disabled` };
    }
    /**
     * Create a new plugin scaffold and register it.
     */
    create(name, type) {
        try {
            const pluginPath = this.loader.createScaffold(name, type);
            // Register in manifest
            this.manifest.upsertPlugin({
                name,
                version: '1.0.0',
                type,
                description: `${name} plugin`,
                entry: `${name}/${type === 'agent' ? 'agent.md' : type === 'workflow' ? 'workflow.yaml' : type === 'skill' ? 'skill.md' : type === 'task' ? 'task.md' : 'hook.sh'}`,
                enabled: false,
            });
            return { success: true, path: pluginPath, message: `Plugin ${name} created at ${pluginPath}` };
        }
        catch (err) {
            return { success: false, path: '', message: err.message };
        }
    }
    /**
     * Format plugin list for console display.
     */
    formatList(plugins) {
        if (plugins.length === 0) {
            return 'No plugins found.\n\nCreate one with: kratos plugins create <name> --type <agent|workflow|skill|task|hook>';
        }
        const lines = [
            'Installed Plugins',
            '='.repeat(50),
            '',
        ];
        for (const p of plugins) {
            const status = p.enabled ? 'ENABLED' : 'DISABLED';
            const valid = p.valid ? '' : ' [INVALID]';
            lines.push(`  [${status}] ${p.name} v${p.version} (${p.type})${valid}`);
            if (p.errors.length > 0) {
                for (const err of p.errors) {
                    lines.push(`    Error: ${err}`);
                }
            }
        }
        return lines.join('\n');
    }
}
exports.PluginRegistry = PluginRegistry;
//# sourceMappingURL=plugin-registry.js.map