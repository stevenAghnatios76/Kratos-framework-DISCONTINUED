import { type ExtractedClaim } from './claim-extractor';
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
export declare class Validator {
    private extractor;
    private groundTruth;
    constructor(groundTruth: GroundTruth);
    /**
     * Validate an artifact by extracting claims and checking against ground truth.
     */
    validate(artifactPath: string): Promise<ValidationReport>;
    /**
     * Format a validation report for display.
     */
    formatReport(report: ValidationReport): string;
    private verifyClaim;
    private verifyFileRef;
    private verifyDependency;
    private verifyRequirementId;
    private verifyVersion;
}
