// Kratos Plugin Loader
// Plugin discovery and loading from the plugins directory.

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
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

const PLUGIN_TYPES: PluginDefinition['type'][] = ['agent', 'workflow', 'skill', 'task', 'hook'];
const TYPE_DIR_MAP: Record<string, string> = {
  agent: 'agents',
  workflow: 'workflows',
  skill: 'skills',
  task: 'tasks',
  hook: 'hooks',
};

export class PluginLoader {
  private pluginsDir: string;
  private manifest: PluginManifest;

  constructor(pluginsDir: string, manifest: PluginManifest) {
    this.pluginsDir = pluginsDir;
    this.manifest = manifest;
  }

  /**
   * Discover plugins in the plugins directory.
   */
  discover(): DiscoveredPlugin[] {
    const discovered: DiscoveredPlugin[] = [];

    for (const type of PLUGIN_TYPES) {
      const typeDir = path.join(this.pluginsDir, TYPE_DIR_MAP[type]);
      if (!fs.existsSync(typeDir)) continue;

      const entries = fs.readdirSync(typeDir);
      for (const entry of entries) {
        if (entry === '.gitkeep') continue;
        const entryPath = path.join(typeDir, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
          // Directory plugin — look for plugin.yaml
          const manifestPath = path.join(entryPath, 'plugin.yaml');
          const has_manifest = fs.existsSync(manifestPath);
          let manifest: Partial<PluginDefinition> | undefined;

          if (has_manifest) {
            try {
              manifest = yaml.parse(fs.readFileSync(manifestPath, 'utf-8'));
            } catch { /* skip corrupt manifests */ }
          }

          discovered.push({
            name: manifest?.name || entry,
            type,
            path: entryPath,
            has_manifest,
            manifest,
          });
        } else if (entry.endsWith('.md') || entry.endsWith('.yaml') || entry.endsWith('.ts')) {
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
  validate(plugin: PluginDefinition): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

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
    } else {
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
        } else if (!depPlugin.enabled) {
          warnings.push(`Dependency ${dep} is disabled`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Create a plugin scaffold.
   */
  createScaffold(name: string, type: PluginDefinition['type']): string {
    const typeDir = TYPE_DIR_MAP[type];
    const pluginDir = path.join(this.pluginsDir, typeDir, name);

    if (fs.existsSync(pluginDir)) {
      throw new Error(`Plugin directory already exists: ${pluginDir}`);
    }

    fs.mkdirSync(pluginDir, { recursive: true });

    // Create plugin.yaml
    const manifest: PluginDefinition = {
      name,
      version: '1.0.0',
      type,
      description: `${name} plugin`,
      entry: `${name}/${this.getEntryFilename(type)}`,
      enabled: false,
      author: '',
    };
    fs.writeFileSync(
      path.join(pluginDir, 'plugin.yaml'),
      yaml.stringify(manifest),
      'utf-8'
    );

    // Create entry file
    const entryContent = this.getEntryTemplate(name, type);
    const entryFile = this.getEntryFilename(type);
    fs.writeFileSync(path.join(pluginDir, entryFile), entryContent, 'utf-8');

    return pluginDir;
  }

  private getEntryFilename(type: PluginDefinition['type']): string {
    switch (type) {
      case 'agent': return 'agent.md';
      case 'workflow': return 'workflow.yaml';
      case 'skill': return 'skill.md';
      case 'task': return 'task.md';
      case 'hook': return 'hook.sh';
    }
  }

  private getEntryTemplate(name: string, type: PluginDefinition['type']): string {
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
