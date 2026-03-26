// Kratos Sprint Metrics
// Velocity, cycle time, throughput, burndown, and health score.

import * as fs from 'fs';
import * as yaml from 'yaml';
import type { MemoryManager } from '../../intelligence/memory/memory-manager.js';
import { MetricsCollector } from './collector.js';

interface StoryStatus {
  key: string;
  title: string;
  status: string;
  points?: number;
  started_at?: string;
  completed_at?: string;
  assignee?: string;
}

interface SprintData {
  sprint_id: string;
  sprint_name: string;
  start_date: string;
  end_date: string;
  stories: StoryStatus[];
}

export interface SprintReport {
  sprint_id: string;
  velocity: number;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  avg_cycle_time_days: number;
  throughput: number;
  burndown: { date: string; remaining: number }[];
  health_score: number;
  stories_by_status: Record<string, number>;
}

export class SprintMetrics {
  private collector: MetricsCollector;

  constructor(manager: MemoryManager) {
    this.collector = new MetricsCollector(manager);
  }

  /**
   * Calculate sprint metrics from sprint-status.yaml.
   */
  calculate(statusPath: string): SprintReport {
    if (!fs.existsSync(statusPath)) {
      throw new Error(`Sprint status file not found: ${statusPath}`);
    }

    const raw = fs.readFileSync(statusPath, 'utf-8');
    const data = yaml.parse(raw) as SprintData;
    const stories = data.stories || [];

    const planned_points = stories.reduce((sum, s) => sum + (s.points || 0), 0);
    const completedStories = stories.filter(s => s.status === 'done');
    const completed_points = completedStories.reduce((sum, s) => sum + (s.points || 0), 0);

    const completion_rate = planned_points > 0 ? completed_points / planned_points : 0;
    const velocity = completed_points;
    const throughput = completedStories.length;

    // Cycle time: average days from started_at to completed_at
    const cycleTimes: number[] = [];
    for (const story of completedStories) {
      if (story.started_at && story.completed_at) {
        const start = new Date(story.started_at).getTime();
        const end = new Date(story.completed_at).getTime();
        cycleTimes.push((end - start) / 86400000);
      }
    }
    const avg_cycle_time_days = cycleTimes.length > 0
      ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
      : 0;

    // Burndown: simplified daily remaining
    const burndown = this.buildBurndown(data, stories);

    // Stories by status
    const stories_by_status: Record<string, number> = {};
    for (const story of stories) {
      stories_by_status[story.status] = (stories_by_status[story.status] || 0) + 1;
    }

    // Health score (0-100): weighted composite
    const health_score = this.calculateHealthScore(
      completion_rate, avg_cycle_time_days, stories_by_status, stories.length
    );

    return {
      sprint_id: data.sprint_id || 'unknown',
      velocity,
      planned_points,
      completed_points,
      completion_rate,
      avg_cycle_time_days,
      throughput,
      burndown,
      health_score,
      stories_by_status,
    };
  }

  /**
   * Record sprint metrics to the metrics table.
   */
  recordMetrics(report: SprintReport): void {
    const dims = { sprint_id: report.sprint_id };
    this.collector.recordBatch([
      { metric_type: 'sprint', metric_name: 'velocity', value: report.velocity, unit: 'points', dimensions: dims },
      { metric_type: 'sprint', metric_name: 'completion_rate', value: report.completion_rate, unit: 'ratio', dimensions: dims },
      { metric_type: 'sprint', metric_name: 'avg_cycle_time', value: report.avg_cycle_time_days, unit: 'days', dimensions: dims },
      { metric_type: 'sprint', metric_name: 'throughput', value: report.throughput, unit: 'stories', dimensions: dims },
      { metric_type: 'sprint', metric_name: 'health_score', value: report.health_score, unit: 'score', dimensions: dims },
    ]);
  }

  /**
   * Format sprint report for console display.
   */
  formatReport(report: SprintReport): string {
    const lines: string[] = [
      `Sprint Report: ${report.sprint_id}`,
      '='.repeat(50),
      '',
      `Velocity:         ${report.velocity} points`,
      `Planned:          ${report.planned_points} points`,
      `Completed:        ${report.completed_points} points`,
      `Completion rate:  ${(report.completion_rate * 100).toFixed(1)}%`,
      `Avg cycle time:   ${report.avg_cycle_time_days.toFixed(1)} days`,
      `Throughput:        ${report.throughput} stories`,
      `Health score:     ${report.health_score}/100`,
      '',
      'Stories by Status:',
    ];

    for (const [status, count] of Object.entries(report.stories_by_status)) {
      lines.push(`  ${status}: ${count}`);
    }

    if (report.burndown.length > 0) {
      lines.push('', 'Burndown:');
      for (const point of report.burndown) {
        const bar = '#'.repeat(Math.min(point.remaining, 40));
        lines.push(`  ${point.date}: ${bar} (${point.remaining})`);
      }
    }

    return lines.join('\n');
  }

  private buildBurndown(data: SprintData, stories: StoryStatus[]): { date: string; remaining: number }[] {
    if (!data.start_date || !data.end_date) return [];

    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    const totalPoints = stories.reduce((sum, s) => sum + (s.points || 0), 0);
    const burndown: { date: string; remaining: number }[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const doneByDate = stories
        .filter(s => s.completed_at && new Date(s.completed_at) <= current)
        .reduce((sum, s) => sum + (s.points || 0), 0);
      burndown.push({ date: dateStr, remaining: totalPoints - doneByDate });
      current.setDate(current.getDate() + 1);
    }

    return burndown;
  }

  private calculateHealthScore(
    completionRate: number,
    avgCycleTime: number,
    byStatus: Record<string, number>,
    totalStories: number
  ): number {
    // Completion contributes 40%
    const completionScore = Math.min(completionRate * 100, 100) * 0.4;

    // Cycle time contributes 25% (lower is better, cap at 14 days)
    const cycleScore = avgCycleTime > 0 ? Math.max(0, (1 - avgCycleTime / 14)) * 25 : 25;

    // Blocked stories penalize 20%
    const blocked = byStatus['blocked'] || 0;
    const blockRate = totalStories > 0 ? blocked / totalStories : 0;
    const blockScore = (1 - blockRate) * 20;

    // Flow balance contributes 15% (stories in progress shouldn't be too many)
    const inProgress = byStatus['in-progress'] || 0;
    const wipRatio = totalStories > 0 ? inProgress / totalStories : 0;
    const wipScore = wipRatio <= 0.3 ? 15 : Math.max(0, 15 - (wipRatio - 0.3) * 50);

    return Math.round(completionScore + cycleScore + blockScore + wipScore);
  }
}
