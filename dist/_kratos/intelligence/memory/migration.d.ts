import { MemoryManager, MemoryEntry } from './memory-manager';
export declare class SidecarMigration {
    private manager;
    private sidecarDir;
    constructor(memoryManager: MemoryManager, sidecarDir: string);
    discoverSidecars(): Promise<string[]>;
    parseSidecar(agentId: string, filePath: string): Promise<MemoryEntry[]>;
    migrate(): Promise<{
        agents_migrated: number;
        entries_imported: number;
        errors: string[];
    }>;
    private classifyHeading;
}
