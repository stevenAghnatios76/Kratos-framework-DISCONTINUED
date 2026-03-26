"use strict";
// Kratos Validator Engine
// Composes GroundTruth + ClaimExtractor to validate artifact accuracy.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const fs = __importStar(require("fs"));
const claim_extractor_1 = require("./claim-extractor");
class Validator {
    extractor;
    groundTruth;
    constructor(groundTruth) {
        this.extractor = new claim_extractor_1.ClaimExtractor();
        this.groundTruth = groundTruth;
    }
    /**
     * Validate an artifact by extracting claims and checking against ground truth.
     */
    async validate(artifactPath) {
        if (!fs.existsSync(artifactPath)) {
            throw new Error(`Artifact not found: ${artifactPath}`);
        }
        const content = fs.readFileSync(artifactPath, 'utf-8');
        const claims = this.extractor.extract(content);
        const findings = [];
        let verified = 0;
        let findingCounter = 0;
        for (const claim of claims) {
            const result = await this.verifyClaim(claim);
            if (result === null) {
                verified++;
            }
            else {
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
    formatReport(report) {
        const lines = [
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
        }
        else {
            lines.push('No findings — all claims verified.');
        }
        return lines.join('\n');
    }
    async verifyClaim(claim) {
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
    async verifyFileRef(claim) {
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
    async verifyDependency(claim) {
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
    async verifyRequirementId(claim) {
        // Requirement IDs are informational — flag if orphaned but don't fail
        return {
            severity: 'INFO',
            claim,
            message: `Requirement ID ${claim.value} found — ensure it traces to a planning artifact`,
            remediation: `Verify ${claim.value} exists in docs/planning-artifacts/`,
        };
    }
    async verifyVersion(claim) {
        // Version claims are informational unless they're for the framework itself
        const facts = await this.groundTruth.getFacts('config');
        const frameworkVersion = facts.find(f => f.key === 'framework:version');
        const packageVersion = facts.find(f => f.key === 'package:version');
        if (frameworkVersion && claim.value === frameworkVersion.value)
            return null;
        if (packageVersion && claim.value === packageVersion.value)
            return null;
        // Not a known version — just info
        return null;
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map