// Kratos Technical Debt Tracker
// Detects complexity, size violations, and test gaps using heuristics.

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface DebtItem {
  file: string;
  category: 'complexity' | 'size' | 'test-gap' | 'duplication' | 'todo';
  severity: 'low' | 'medium' | 'high';
  description: string;
  value?: number;
}

export interface DebtReport {
  total_items: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  debt_score: number;        // 0-100, higher = more debt
  items: DebtItem[];
  hotspots: { file: string; issues: number }[];
}

// Thresholds
const MAX_FILE_LINES = 300;
const MAX_FUNCTION_LINES = 50;
const MAX_CYCLOMATIC_PROXY = 15;   // if/else/for/while/switch/case/catch count
const TODO_PATTERN = /(?:TODO|FIXME|HACK|XXX|TEMP)/i;

export class DebtTracker {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Scan for technical debt.
   */
  analyze(): DebtReport {
    const items: DebtItem[] = [];
    const sourceFiles = this.getSourceFiles();

    for (const filePath of sourceFiles) {
      const absPath = path.join(this.projectRoot, filePath);
      if (!fs.existsSync(absPath)) continue;

      const content = fs.readFileSync(absPath, 'utf-8');
      const lines = content.split('\n');

      // Size check
      if (lines.length > MAX_FILE_LINES) {
        items.push({
          file: filePath,
          category: 'size',
          severity: lines.length > MAX_FILE_LINES * 2 ? 'high' : 'medium',
          description: `File has ${lines.length} lines (max ${MAX_FILE_LINES})`,
          value: lines.length,
        });
      }

      // Complexity proxy: count control flow statements
      const complexity = this.countComplexity(content);
      if (complexity > MAX_CYCLOMATIC_PROXY) {
        items.push({
          file: filePath,
          category: 'complexity',
          severity: complexity > MAX_CYCLOMATIC_PROXY * 2 ? 'high' : 'medium',
          description: `High complexity score: ${complexity} (threshold: ${MAX_CYCLOMATIC_PROXY})`,
          value: complexity,
        });
      }

      // Long functions
      const longFns = this.findLongFunctions(content, filePath);
      items.push(...longFns);

      // TODO/FIXME/HACK markers
      for (let i = 0; i < lines.length; i++) {
        if (TODO_PATTERN.test(lines[i])) {
          items.push({
            file: filePath,
            category: 'todo',
            severity: 'low',
            description: `Line ${i + 1}: ${lines[i].trim().substring(0, 100)}`,
          });
        }
      }

      // Test gap: source file without corresponding test
      if (this.isSourceFile(filePath)) {
        const hasTest = this.hasTestFile(filePath);
        if (!hasTest) {
          items.push({
            file: filePath,
            category: 'test-gap',
            severity: 'medium',
            description: 'No corresponding test file found',
          });
        }
      }
    }

    const by_severity: Record<string, number> = {};
    const by_category: Record<string, number> = {};
    for (const item of items) {
      by_severity[item.severity] = (by_severity[item.severity] || 0) + 1;
      by_category[item.category] = (by_category[item.category] || 0) + 1;
    }

    // Hotspots: files with most issues
    const fileIssueCount: Record<string, number> = {};
    for (const item of items) {
      fileIssueCount[item.file] = (fileIssueCount[item.file] || 0) + 1;
    }
    const hotspots = Object.entries(fileIssueCount)
      .map(([file, issues]) => ({ file, issues }))
      .sort((a, b) => b.issues - a.issues)
      .slice(0, 10);

    // Debt score: weighted sum
    const highCount = by_severity['high'] || 0;
    const medCount = by_severity['medium'] || 0;
    const lowCount = by_severity['low'] || 0;
    const weightedScore = highCount * 3 + medCount * 2 + lowCount * 1;
    const maxPossible = sourceFiles.length * 3;
    const debt_score = maxPossible > 0
      ? Math.min(100, Math.round((weightedScore / maxPossible) * 100))
      : 0;

    return {
      total_items: items.length,
      by_severity,
      by_category,
      debt_score,
      items,
      hotspots,
    };
  }

  /**
   * Format debt report for console display.
   */
  formatReport(report: DebtReport): string {
    const lines: string[] = [
      'Technical Debt Report',
      '='.repeat(50),
      '',
      `Debt score:      ${report.debt_score}/100 (lower is better)`,
      `Total issues:    ${report.total_items}`,
      '',
      'By Severity:',
    ];

    for (const [sev, count] of Object.entries(report.by_severity)) {
      lines.push(`  ${sev}: ${count}`);
    }

    lines.push('', 'By Category:');
    for (const [cat, count] of Object.entries(report.by_category)) {
      lines.push(`  ${cat}: ${count}`);
    }

    if (report.hotspots.length > 0) {
      lines.push('', 'Hotspots (most issues):');
      for (const h of report.hotspots) {
        lines.push(`  ${h.file}: ${h.issues} issues`);
      }
    }

    // Show high-severity items
    const highItems = report.items.filter(i => i.severity === 'high');
    if (highItems.length > 0) {
      lines.push('', 'High Severity Items:');
      for (const item of highItems.slice(0, 15)) {
        lines.push(`  [${item.category}] ${item.file}`);
        lines.push(`    ${item.description}`);
      }
    }

    return lines.join('\n');
  }

  private getSourceFiles(): string[] {
    try {
      const output = execSync('git ls-files', {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        timeout: 10000,
      });
      return output.trim().split('\n')
        .filter(f => /\.(ts|tsx|js|jsx|py)$/.test(f))
        .filter(f => !f.includes('node_modules'));
    } catch {
      return [];
    }
  }

  private countComplexity(content: string): number {
    const patterns = [
      /\bif\s*\(/g, /\belse\s/g, /\bfor\s*\(/g, /\bwhile\s*\(/g,
      /\bswitch\s*\(/g, /\bcase\s/g, /\bcatch\s*\(/g, /\?\?/g, /\?\./g,
    ];
    let count = 0;
    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) count += matches.length;
    }
    return count;
  }

  private findLongFunctions(content: string, filePath: string): DebtItem[] {
    const items: DebtItem[] = [];
    const fnRegex = /(?:function\s+\w+|(?:async\s+)?(?:\w+\s*=\s*)?(?:async\s+)?(?:\([^)]*\)|[\w]+)\s*(?:=>|{))/g;
    let match;
    while ((match = fnRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const remaining = content.substring(match.index);
      let braceCount = 0;
      let endIdx = 0;
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i] === '{') braceCount++;
        if (remaining[i] === '}') {
          braceCount--;
          if (braceCount === 0) { endIdx = i; break; }
        }
      }
      if (endIdx > 0) {
        const fnLines = remaining.substring(0, endIdx).split('\n').length;
        if (fnLines > MAX_FUNCTION_LINES) {
          items.push({
            file: filePath,
            category: 'complexity',
            severity: fnLines > MAX_FUNCTION_LINES * 2 ? 'high' : 'medium',
            description: `Function at line ${startLine} has ${fnLines} lines (max ${MAX_FUNCTION_LINES})`,
            value: fnLines,
          });
        }
      }
    }
    return items;
  }

  private isSourceFile(filePath: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(filePath)
      && !filePath.includes('.test.')
      && !filePath.includes('.spec.')
      && !filePath.includes('__tests__');
  }

  private hasTestFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    const base = filePath.replace(ext, '');
    const testPatterns = [
      `${base}.test${ext}`,
      `${base}.spec${ext}`,
      `${base}.test.ts`,
      `${base}.spec.ts`,
    ];

    for (const testPath of testPatterns) {
      if (fs.existsSync(path.join(this.projectRoot, testPath))) return true;
    }

    // Check __tests__ directory
    const dir = path.dirname(filePath);
    const name = path.basename(filePath);
    const testsDir = path.join(this.projectRoot, dir, '__tests__', name);
    return fs.existsSync(testsDir);
  }
}
