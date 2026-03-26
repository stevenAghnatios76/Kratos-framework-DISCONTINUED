// Kratos Drift Detector
// Architecture doc vs reality comparison.

import * as fs from 'fs';
import * as path from 'path';

interface DriftItem {
  claim: string;
  source_file: string;
  status: 'valid' | 'drifted' | 'unknown';
  detail: string;
}

export interface DriftReport {
  total_claims: number;
  valid: number;
  drifted: number;
  unknown: number;
  drift_score: number;    // 0-100, higher = more drift (bad)
  items: DriftItem[];
}

export class DriftDetector {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Detect drift between architecture docs and actual codebase.
   */
  detect(): DriftReport {
    const items: DriftItem[] = [];

    // Check architecture.md for structural claims
    const archPaths = [
      path.join(this.projectRoot, 'docs', 'planning-artifacts', 'architecture.md'),
      path.join(this.projectRoot, 'docs', 'planning-artifacts', 'technical-architecture.md'),
    ];

    for (const archPath of archPaths) {
      if (fs.existsSync(archPath)) {
        const claims = this.extractClaims(archPath);
        items.push(...claims);
      }
    }

    // Check CLAUDE.md framework location claims
    const claudeMdPath = path.join(this.projectRoot, 'CLAUDE.md');
    if (fs.existsSync(claudeMdPath)) {
      const claims = this.extractDirectoryClaims(claudeMdPath);
      items.push(...claims);
    }

    // Check package.json dependencies
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const claims = this.checkPackageDeps(pkgPath);
      items.push(...claims);
    }

    const valid = items.filter(i => i.status === 'valid').length;
    const drifted = items.filter(i => i.status === 'drifted').length;
    const unknown = items.filter(i => i.status === 'unknown').length;
    const total_claims = items.length;

    const drift_score = total_claims > 0
      ? Math.round((drifted / total_claims) * 100)
      : 0;

    return { total_claims, valid, drifted, unknown, drift_score, items };
  }

  /**
   * Format drift report for console display.
   */
  formatReport(report: DriftReport): string {
    const lines: string[] = [
      'Architecture Drift Report',
      '='.repeat(50),
      '',
      `Total claims:  ${report.total_claims}`,
      `Valid:         ${report.valid}`,
      `Drifted:       ${report.drifted}`,
      `Unknown:       ${report.unknown}`,
      `Drift score:   ${report.drift_score}% (lower is better)`,
      '',
    ];

    if (report.items.length > 0) {
      const drifted = report.items.filter(i => i.status === 'drifted');
      if (drifted.length > 0) {
        lines.push('Drifted Claims:');
        for (const item of drifted) {
          lines.push(`  [DRIFT] ${item.claim}`);
          lines.push(`          ${item.detail}`);
          lines.push(`          Source: ${item.source_file}`);
          lines.push('');
        }
      }

      const valid = report.items.filter(i => i.status === 'valid');
      if (valid.length > 0) {
        lines.push(`Valid Claims: ${valid.length} (all verified)`);
      }
    }

    return lines.join('\n');
  }

  private extractClaims(archPath: string): DriftItem[] {
    const content = fs.readFileSync(archPath, 'utf-8');
    const items: DriftItem[] = [];
    const relSource = path.relative(this.projectRoot, archPath);

    // Look for directory/file structure claims (```tree or ```text blocks)
    const treeRegex = /```(?:tree|text|)\n([\s\S]*?)```/g;
    let match;
    while ((match = treeRegex.exec(content)) !== null) {
      const block = match[1];
      const pathLines = block.split('\n')
        .map(l => l.replace(/[├└│──\s]/g, '').replace(/\s*#.*$/, '').trim())
        .filter(l => l.length > 0 && (l.includes('/') || l.includes('.')));

      for (const p of pathLines) {
        const absPath = path.join(this.projectRoot, p);
        const exists = fs.existsSync(absPath);
        items.push({
          claim: `Path exists: ${p}`,
          source_file: relSource,
          status: exists ? 'valid' : 'drifted',
          detail: exists ? 'Verified' : 'Path not found on disk',
        });
      }
    }

    // Look for "uses X technology" claims
    const techRegex = /(?:uses?|built with|powered by)\s+(\w+(?:\.\w+)?)/gi;
    while ((match = techRegex.exec(content)) !== null) {
      const tech = match[1].toLowerCase();
      items.push({
        claim: `Technology: ${tech}`,
        source_file: relSource,
        status: this.checkTechExists(tech) ? 'valid' : 'unknown',
        detail: this.checkTechExists(tech) ? 'Found in dependencies or files' : 'Could not verify',
      });
    }

    return items;
  }

  private extractDirectoryClaims(claudeMdPath: string): DriftItem[] {
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    const items: DriftItem[] = [];
    const relSource = path.relative(this.projectRoot, claudeMdPath);

    // Look for directory paths with ├── or └── markers
    const dirRegex = /[├└]──\s+(\S+\/)/g;
    let match;
    while ((match = dirRegex.exec(content)) !== null) {
      const dirName = match[1].replace(/\/$/, '');
      // Try common base paths
      for (const base of ['_kratos', '']) {
        const checkPath = path.join(this.projectRoot, base, dirName);
        if (fs.existsSync(checkPath)) {
          items.push({
            claim: `Directory exists: ${base ? base + '/' : ''}${dirName}`,
            source_file: relSource,
            status: 'valid',
            detail: 'Verified',
          });
          break;
        }
      }
    }

    return items;
  }

  private checkPackageDeps(pkgPath: string): DriftItem[] {
    const items: DriftItem[] = [];
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [dep] of Object.entries(allDeps)) {
        const depPath = path.join(this.projectRoot, 'node_modules', dep);
        const installed = fs.existsSync(depPath);
        items.push({
          claim: `Dependency installed: ${dep}`,
          source_file: 'package.json',
          status: installed ? 'valid' : 'drifted',
          detail: installed ? 'Installed' : 'Listed in package.json but not in node_modules',
        });
      }
    } catch { /* ignore parse errors */ }
    return items;
  }

  private checkTechExists(tech: string): boolean {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const content = fs.readFileSync(pkgPath, 'utf-8').toLowerCase();
        if (content.includes(tech)) return true;
      } catch { /* ignore */ }
    }
    return false;
  }
}
