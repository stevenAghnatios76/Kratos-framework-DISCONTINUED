"use strict";
// Kratos Claim Extractor
// Regex-based extraction of verifiable claims from markdown artifacts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaimExtractor = void 0;
class ClaimExtractor {
    static PATTERNS = {
        // File references: paths like src/foo/bar.ts, ./components/App.tsx, _kratos/core/cli.ts
        file_ref: /(?:^|\s|`)((?:\.{0,2}\/)?(?:[\w@._-]+\/)+[\w._-]+\.[\w]+)(?:\s|`|$|,|;|\))/gm,
        // Dependencies: package names in backticks or after import/require
        dependency: /(?:["'`])(@?[\w][\w./-]*[\w])["'`]|(?:from|require\()\s*["'](@?[\w][\w./-]*[\w])["']/gm,
        // Requirement IDs: REQ-001, FR-123, NFR-45, US-100
        requirement_id: /\b((?:REQ|FR|NFR|US|BR|TR|SR)-\d{1,5})\b/g,
        // API endpoints: GET /api/v1/users, POST /health
        api_endpoint: /\b((?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/[\w/:{}-]+)/g,
        // Metrics: percentages, durations, sizes
        metric: /\b(\d+(?:\.\d+)?(?:\s*(?:ms|s|sec|min|%|KB|MB|GB|TB|k|M|req\/s|rps|tps|p99|p95|p50)))\b/g,
        // Versions: v1.2.3, 1.27.57, ^5.6.2
        version: /\b(v?\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)\b/g,
    };
    /**
     * Extract all verifiable claims from markdown content.
     */
    extract(content) {
        const claims = [];
        const lines = content.split('\n');
        for (const [type, pattern] of Object.entries(ClaimExtractor.PATTERNS)) {
            // Reset regex state
            const regex = new RegExp(pattern.source, pattern.flags);
            let match;
            while ((match = regex.exec(content)) !== null) {
                const value = match[1] || match[2];
                if (!value)
                    continue;
                // Skip common false positives
                if (type === 'file_ref' && this.isLikelyNotFilePath(value))
                    continue;
                if (type === 'version' && this.isLikelyNotVersion(value))
                    continue;
                if (type === 'dependency' && this.isLikelyNotDependency(value))
                    continue;
                const lineNumber = this.getLineNumber(content, match.index);
                const lineContent = lines[lineNumber - 1]?.trim() || '';
                claims.push({
                    type: type,
                    value,
                    line: lineNumber,
                    context: lineContent.substring(0, 200),
                });
            }
        }
        return this.deduplicate(claims);
    }
    /**
     * Extract only claims of a specific type.
     */
    extractByType(content, type) {
        return this.extract(content).filter(c => c.type === type);
    }
    /**
     * Get a summary of all claims found.
     */
    summarize(claims) {
        const summary = {};
        for (const claim of claims) {
            summary[claim.type] = (summary[claim.type] || 0) + 1;
        }
        return summary;
    }
    getLineNumber(content, charIndex) {
        const lines = content.substring(0, charIndex).split('\n');
        return lines.length;
    }
    isLikelyNotFilePath(value) {
        // Skip URLs
        if (value.includes('://'))
            return true;
        // Skip things that are just dotted identifiers
        if (!value.includes('/'))
            return true;
        // Skip common non-file patterns
        if (/^\d/.test(value))
            return true;
        return false;
    }
    isLikelyNotVersion(value) {
        // Skip standalone small numbers like "1.0" without context
        if (/^\d+\.\d+$/.test(value) && parseFloat(value) < 1)
            return true;
        return false;
    }
    isLikelyNotDependency(value) {
        // Skip local relative imports
        if (value.startsWith('./') || value.startsWith('../'))
            return true;
        // Skip very short strings
        if (value.length < 2)
            return true;
        return false;
    }
    deduplicate(claims) {
        const seen = new Set();
        return claims.filter(claim => {
            const key = `${claim.type}:${claim.value}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    }
}
exports.ClaimExtractor = ClaimExtractor;
//# sourceMappingURL=claim-extractor.js.map