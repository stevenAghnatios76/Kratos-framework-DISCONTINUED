export interface ExtractedClaim {
    type: 'file_ref' | 'dependency' | 'requirement_id' | 'api_endpoint' | 'metric' | 'version';
    value: string;
    line: number;
    context: string;
}
export declare class ClaimExtractor {
    private static readonly PATTERNS;
    /**
     * Extract all verifiable claims from markdown content.
     */
    extract(content: string): ExtractedClaim[];
    /**
     * Extract only claims of a specific type.
     */
    extractByType(content: string, type: ExtractedClaim['type']): ExtractedClaim[];
    /**
     * Get a summary of all claims found.
     */
    summarize(claims: ExtractedClaim[]): Record<string, number>;
    private getLineNumber;
    private isLikelyNotFilePath;
    private isLikelyNotVersion;
    private isLikelyNotDependency;
    private deduplicate;
}
