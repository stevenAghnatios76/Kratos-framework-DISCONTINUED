// Kratos Ownership Map
// File-to-story-to-agent mapping from checkpoint data.

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

interface OwnershipEntry {
  file: string;
  stories: string[];
  agents: string[];
  last_workflow: string;
  last_modified: string;
}

export interface OwnershipReport {
  total_files: number;
  total_entries: number;
  by_agent: Record<string, number>;
  by_story: Record<string, number>;
  entries: OwnershipEntry[];
  hotspots: { file: string; touch_count: number }[];
}

export class OwnershipMap {
  private checkpointDir: string;

  constructor(checkpointDir: string) {
    this.checkpointDir = checkpointDir;
  }

  /**
   * Build ownership map from checkpoint files_touched data.
   */
  build(): OwnershipReport {
    const checkpoints = this.loadCheckpoints();
    const fileMap: Map<string, { stories: Set<string>; agents: Set<string>; workflow: string; date: string; touches: number }> = new Map();

    for (const cp of checkpoints) {
      const filesTouched = (cp.files_touched as unknown[]) || [];
      const agentId = (cp.agent_id as string) || (cp.workflow_name as string) || 'unknown';
      const storyKey = (cp.story_key as string) || '';
      const workflow = (cp.workflow_name as string) || '';
      const date = (cp.completed_at as string) || (cp.timestamp as string) || '';

      for (const file of filesTouched) {
        const filePath = typeof file === 'string' ? file : ((file as Record<string, string>).path || '');
        if (!filePath) continue;

        if (!fileMap.has(filePath)) {
          fileMap.set(filePath, {
            stories: new Set(),
            agents: new Set(),
            workflow: '',
            date: '',
            touches: 0,
          });
        }

        const entry = fileMap.get(filePath)!;
        if (storyKey) entry.stories.add(storyKey);
        entry.agents.add(agentId);
        entry.workflow = workflow;
        entry.date = date;
        entry.touches++;
      }
    }

    const entries: OwnershipEntry[] = [];
    const by_agent: Record<string, number> = {};
    const by_story: Record<string, number> = {};

    for (const [file, data] of fileMap) {
      entries.push({
        file,
        stories: Array.from(data.stories),
        agents: Array.from(data.agents),
        last_workflow: data.workflow,
        last_modified: data.date,
      });

      for (const agent of data.agents) {
        by_agent[agent] = (by_agent[agent] || 0) + 1;
      }
      for (const story of data.stories) {
        by_story[story] = (by_story[story] || 0) + 1;
      }
    }

    // Sort entries by touch count for hotspots
    const hotspots = Array.from(fileMap.entries())
      .map(([file, data]) => ({ file, touch_count: data.touches }))
      .sort((a, b) => b.touch_count - a.touch_count)
      .slice(0, 10);

    return {
      total_files: fileMap.size,
      total_entries: entries.length,
      by_agent,
      by_story,
      entries,
      hotspots,
    };
  }

  /**
   * Look up ownership for a specific file.
   */
  lookupFile(filePath: string): OwnershipEntry | null {
    const report = this.build();
    return report.entries.find(e => e.file === filePath || e.file.endsWith(filePath)) || null;
  }

  /**
   * Format ownership report for console display.
   */
  formatReport(report: OwnershipReport): string {
    const lines: string[] = [
      'File Ownership Map',
      '='.repeat(50),
      '',
      `Tracked files:   ${report.total_files}`,
      '',
      'By Agent:',
    ];

    const sortedAgents = Object.entries(report.by_agent).sort((a, b) => b[1] - a[1]);
    for (const [agent, count] of sortedAgents) {
      lines.push(`  ${agent}: ${count} files`);
    }

    if (Object.keys(report.by_story).length > 0) {
      lines.push('', 'By Story:');
      const sortedStories = Object.entries(report.by_story).sort((a, b) => b[1] - a[1]);
      for (const [story, count] of sortedStories.slice(0, 10)) {
        lines.push(`  ${story}: ${count} files`);
      }
    }

    if (report.hotspots.length > 0) {
      lines.push('', 'File Hotspots (most touched):');
      for (const h of report.hotspots) {
        lines.push(`  ${h.file}: ${h.touch_count} touches`);
      }
    }

    return lines.join('\n');
  }

  private loadCheckpoints(): Record<string, unknown>[] {
    if (!fs.existsSync(this.checkpointDir)) return [];

    const files = fs.readdirSync(this.checkpointDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    const checkpoints: Record<string, unknown>[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.checkpointDir, file), 'utf-8');
        const parsed = yaml.parse(content);
        if (parsed && typeof parsed === 'object') {
          checkpoints.push(parsed as Record<string, unknown>);
        }
      } catch { /* skip malformed checkpoints */ }
    }

    return checkpoints;
  }
}
