// Kratos Validator Engine
// Composes GroundTruth + ClaimExtractor to validate artifact accuracy.

import * as fs from 'fs';
import { ClaimExtractor, type ExtractedClaim } from './claim-extractor';
import { GroundTruth } from './ground-truth';

export type FindingSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ValidationFinding {
  id: string;
  severity: FindingSeverity;
  claim: ExtractedClaim;
  message: string;
  remediation: string;
}

export interface ValidationReport {
  artifact_path: string;
  timestamp: string;
  total_claims: number;
  verified: number;
  findings: ValidationFinding[];
  summary: {
    critical: number;
    warning: number;
    info: number;
  };
  pass: boolean;
}

export class Validator {
  private extractor: ClaimExtractor;
  private groundTruth: GroundTruth;

  constructor(groundTruth: GroundTruth) {
    this.extractor = new ClaimExtractor();
    this.groundTruth = groundTruth;
  }

  /**
   * Validate an artifact by extracting claims and checking against ground truth.
   */
  async validate(artifactPath: string): Promise<ValidationReport> {
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const content = fs.readFileSync(artifactPath, 'utf-8');
    const claims = this.extractor.extract(content);
    const findings: ValidationFinding[] = [];
    let verified = 0;
    let findingCounter = 0;

    for (const claim of claims) {
      const result = await this.verifyClaim(claim);
      if (result === null) {
        verified++;
      } else {
        findingCounter++;
        findings.push({
          id: `F-${String(findingCounter).padStart(3, '0')}`,
          ...result,
        });
      }
    }

    const summary = {
      critical: findings.filter(f => f.severity === 'CRITICAL').length,
      warning: findings.filter(f => f.severity === 'WARNING').length,
      info: findings.filter(f => f.severity === 'INFO').length,
    };

    return {
      artifact_path: artifactPath,
      timestamp: new Date().toISOString(),
      total_claims: claims.length,
      verified,
      findings,
      summary,
      pass: summary.critical === 0,
    };
  }

  /**
   * Format a validation report for display.
   */
  formatReport(report: ValidationReport): string {
    const lines: string[] = [
      `Validation Report`,
      `${'='.repeat(50)}`,
      `Artifact: ${report.artifact_path}`,
      `Date:     ${report.timestamp}`,
      `Result:   ${report.pass ? 'PASS' : 'FAIL'}`,
      '',
      `Claims:   ${report.total_claims} total, ${report.verified} verified`,
      `Findings: ${report.summary.critical} critical, ${report.summary.warning} warning, ${report.summary.info} info`,
      '',
    ];

    if (report.findings.length > 0) {
      lines.push('Findings:');
      lines.push('-'.repeat(50));

      for (const finding of report.findings) {
        lines.push(`[${finding.id}] ${finding.severity}: ${finding.message}`);
        lines.push(`  Claim: ${finding.claim.type} = "${finding.claim.value}" (line ${finding.claim.line})`);
        lines.push(`  Fix:   ${finding.remediation}`);
        lines.push('');
      }
    } else {
      lines.push('No findings — all claims verified.');
    }

    return lines.join('\n');
  }

  private async verifyClaim(claim: ExtractedClaim): Promise<Omit<ValidationFinding, 'id'> | null> {
    switch (claim.type) {
      case 'file_ref':
        return this.verifyFileRef(claim);
      case 'dependency':
        return this.verifyDependency(claim);
      case 'requirement_id':
        return this.verifyRequirementId(claim);
      case 'api_endpoint':
        // API endpoints are informational — no verification needed
        return null;
      case 'metric':
        // Metrics are informational — no verification needed
        return null;
      case 'version':
        return this.verifyVersion(claim);
      default:
        return null;
    }
  }

  private async verifyFileRef(claim: ExtractedClaim): Promise<Omit<ValidationFinding, 'id'> | null> {
    const exists = await this.groundTruth.fileExists(claim.value);
    if (!exists) {
      return {
        severity: 'CRITICAL',
        claim,
        message: `Referenced file does not exist: ${claim.value}`,
        remediation: `Create the file or update the reference to point to an existing file`,
      };
    }
    return null;
  }

  private async verifyDependency(claim: ExtractedClaim): Promise<Omit<ValidationFinding, 'id'> | null> {
    const result = await this.groundTruth.dependencyExists(claim.value);
    if (!result.exists) {
      return {
        severity: 'WARNING',
        claim,
        message: `Dependency not found in package.json: ${claim.value}`,
        remediation: `Add ${claim.value} to package.json or remove the reference`,
      };
    }
    return null;
  }

  private async verifyRequirementId(claim: ExtractedClaim): Promise<Omit<ValidationFinding, 'id'> | null> {
    // Requirement IDs are informational — flag if orphaned but don't fail
    return {
      severity: 'INFO',
      claim,
      message: `Requirement ID ${claim.value} found — ensure it traces to a planning artifact`,
      remediation: `Verify ${claim.value} exists in docs/planning-artifacts/`,
    };
  }

  private async verifyVersion(claim: ExtractedClaim): Promise<Omit<ValidationFinding, 'id'> | null> {
    // Version claims are informational unless they're for the framework itself
    const facts = await this.groundTruth.getFacts('config');
    const frameworkVersion = facts.find(f => f.key === 'framework:version');
    const packageVersion = facts.find(f => f.key === 'package:version');

    if (frameworkVersion && claim.value === frameworkVersion.value) return null;
    if (packageVersion && claim.value === packageVersion.value) return null;

    // Not a known version — just info
    return null;
  }
}
