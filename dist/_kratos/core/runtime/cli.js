#!/usr/bin/env node
"use strict";
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
const commander_1 = require("commander");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const program = new commander_1.Command();
// Resolve project root (walk up until we find _kratos/)
function findProjectRoot() {
    let dir = process.cwd();
    while (dir !== path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, '_kratos')))
            return dir;
        dir = path.dirname(dir);
    }
    return process.cwd();
}
const PROJECT_ROOT = findProjectRoot();
const KRATOS_ROOT = path.join(PROJECT_ROOT, '_kratos');
const MEMORY_DB_PATH = path.join(KRATOS_ROOT, '_memory', 'memory.db');
const CHECKPOINT_DIR = path.join(KRATOS_ROOT, '_memory', 'checkpoints');
program
    .name('kratos')
    .description('Kratos Framework CLI — AI-powered product development')
    .version('2.2.0');
// ============================================================
// MEMORY COMMANDS
// ============================================================
const memory = program.command('memory').description('Manage agent memory');
memory
    .command('search <query>')
    .description('Semantic search across all agent memory')
    .option('-a, --agent <id>', 'Filter by agent ID')
    .option('-p, --partition <name>', 'Filter by partition')
    .option('-l, --limit <n>', 'Max results', '10')
    .action(async (query, opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const results = await mm.search(query, {
        agent_id: opts.agent,
        partition: opts.partition,
        limit: parseInt(opts.limit),
    });
    if (results.length === 0) {
        console.log('No results found.');
    }
    else {
        for (const entry of results) {
            console.log(`[${entry.partition}] ${entry.title} (score: ${entry.score}, agent: ${entry.agent_id})`);
            console.log(`  ${entry.content.split('\n')[0].substring(0, 120)}`);
            console.log('');
        }
    }
    await mm.close();
});
memory
    .command('stats')
    .description('Show memory statistics')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const stats = await mm.getStats();
    console.log('Memory Statistics:');
    console.log(`  Total entries: ${stats.total_entries}`);
    console.log(`  Stale: ${stats.stale_count}`);
    console.log(`  Expired: ${stats.expired_count}`);
    console.log('\nBy partition:');
    for (const [p, count] of Object.entries(stats.by_partition)) {
        console.log(`  ${p}: ${count}`);
    }
    console.log('\nBy agent:');
    for (const [a, count] of Object.entries(stats.by_agent)) {
        console.log(`  ${a}: ${count}`);
    }
    await mm.close();
});
memory
    .command('export')
    .description('Export memory to markdown sidecars')
    .option('-a, --agent <id>', 'Export specific agent only')
    .option('-o, --output <dir>', 'Output directory', path.join(KRATOS_ROOT, '_memory'))
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    if (opts.agent) {
        const md = await mm.exportAgentSidecar(opts.agent);
        console.log(md);
    }
    else {
        await mm.exportAllSidecars(opts.output);
        console.log(`Sidecars exported to ${opts.output}`);
    }
    await mm.close();
});
memory
    .command('migrate')
    .description('Import existing markdown sidecars into database')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { SidecarMigration } = await import('../../intelligence/memory/migration.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const migration = new SidecarMigration(mm, path.join(KRATOS_ROOT, '_memory'));
    const result = await migration.migrate();
    console.log(`Migration complete:`);
    console.log(`  Agents migrated: ${result.agents_migrated}`);
    console.log(`  Entries imported: ${result.entries_imported}`);
    if (result.errors.length > 0) {
        console.log(`  Errors: ${result.errors.length}`);
        for (const err of result.errors) {
            console.error(`    ${err}`);
        }
    }
    await mm.close();
});
memory
    .command('expire')
    .description('Remove expired entries')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const count = await mm.expireStaleEntries();
    console.log(`Expired ${count} entries.`);
    await mm.close();
});
// ============================================================
// LEARN COMMANDS
// ============================================================
const learn = program.command('learn').description('Self-learning system');
learn
    .command('distill')
    .description('Extract patterns from scored trajectories')
    .option('-a, --agent <id>', 'Distill for specific agent')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { PatternDistiller } = await import('../../intelligence/learning/pattern-distiller.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const distiller = new PatternDistiller(mm);
    const result = await distiller.runDistillationCycle();
    console.log('Distillation complete:');
    console.log(`  Patterns created: ${result.patterns_created}`);
    console.log(`  Anti-patterns created: ${result.anti_patterns_created}`);
    console.log(`  Trajectories analyzed: ${result.trajectories_analyzed}`);
    await mm.close();
});
learn
    .command('patterns')
    .description('List learned patterns')
    .option('-a, --agent <id>', 'Filter by agent')
    .option('--anti', 'Show anti-patterns instead')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const partition = opts.anti ? 'anti-patterns' : 'patterns';
    const entries = await mm.query({
        partition,
        agent_id: opts.agent,
        status: 'active',
        order_by: 'score',
    });
    if (entries.length === 0) {
        console.log(`No ${partition} found.`);
    }
    else {
        for (const entry of entries) {
            console.log(`[${entry.score.toFixed(2)}] ${entry.title} (agent: ${entry.agent_id})`);
            console.log(`  ${entry.content.split('\n')[0].substring(0, 120)}`);
            console.log('');
        }
    }
    await mm.close();
});
learn
    .command('protect')
    .description('Run forgetting shield protection cycle')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { ForgettingShield } = await import('../../intelligence/learning/forgetting-shield.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const shield = new ForgettingShield(mm);
    const result = await shield.runProtectionCycle();
    console.log('Protection cycle complete:');
    console.log(`  Newly protected: ${result.newly_protected}`);
    console.log(`  Unprotected: ${result.unprotected}`);
    console.log(`  Total protected: ${result.total_protected}`);
    await mm.close();
});
// ============================================================
// SPRINT COMMANDS
// ============================================================
const sprint = program.command('sprint').description('Sprint execution');
sprint
    .command('plan')
    .description('Generate parallel execution plan for current sprint')
    .option('-s, --status <path>', 'Sprint status file path')
    .action(async (opts) => {
    const { DependencyGraph } = await import('./dependency-graph.js');
    const statusPath = opts.status || path.join(PROJECT_ROOT, 'docs', 'implementation-artifacts', 'sprint-status.yaml');
    if (!fs.existsSync(statusPath)) {
        console.error(`Sprint status file not found: ${statusPath}`);
        process.exit(1);
    }
    const graph = new DependencyGraph();
    await graph.buildFromSprint(statusPath);
    console.log(graph.toText());
});
sprint
    .command('reviews <story_key>')
    .description('Run all 6 review gates in parallel for a story')
    .action(async (storyKey) => {
    const { ParallelExecutor } = await import('./parallel-executor.js');
    const executor = new ParallelExecutor({
        max_concurrent: 6,
        mode: 'parallel',
        conflict_detection: false,
        heartbeat_interval_sec: 60,
        stall_timeout_sec: 300,
        execution_mode: 'normal',
    });
    console.log(`Running all 6 reviews for ${storyKey}...`);
    const result = await executor.executeReviewsParallel(storyKey);
    for (const [review, status] of Object.entries(result.results)) {
        console.log(`  ${status === 'PASSED' ? 'PASS' : 'FAIL'} ${review}`);
    }
    console.log(`\nAll passed: ${result.all_passed} (${result.duration_sec.toFixed(1)}s)`);
});
// ============================================================
// PROVIDERS COMMANDS
// ============================================================
const providers = program.command('providers').description('Manage LLM providers');
providers
    .command('list')
    .description('Show configured providers and availability')
    .action(async () => {
    const { ProviderRegistry } = await import('../../providers/index.js');
    const registry = new ProviderRegistry();
    const configPath = path.join(KRATOS_ROOT, '_config', 'providers.yaml');
    await registry.init(configPath);
    const list = registry.listProviders();
    console.log('LLM Providers:\n');
    for (const p of list) {
        const status = p.available ? 'AVAILABLE' : 'DISABLED';
        console.log(`  [${status}] ${p.name} (${p.tier})`);
        console.log(`    fast:           ${p.models.fast}`);
        console.log(`    standard:       ${p.models.standard}`);
        console.log(`    deep_reasoning: ${p.models.deep_reasoning}`);
        console.log('');
    }
});
providers
    .command('test <name>')
    .description('Send test prompt to a provider')
    .action(async (name) => {
    const { ProviderRegistry } = await import('../../providers/index.js');
    const registry = new ProviderRegistry();
    const configPath = path.join(KRATOS_ROOT, '_config', 'providers.yaml');
    await registry.init(configPath);
    const provider = registry.getProvider(name);
    if (!provider) {
        console.error(`Unknown provider: ${name}`);
        process.exit(1);
    }
    if (!provider.available) {
        console.error(`Provider ${name} is not available (SDK missing or not configured)`);
        process.exit(1);
    }
    console.log(`Testing ${name}...`);
    const result = await provider.test();
    console.log(`  OK: ${result.ok}`);
    console.log(`  Latency: ${result.latency_ms}ms`);
    if (result.error)
        console.log(`  Error: ${result.error}`);
});
providers
    .command('cost-estimate')
    .description('Estimate sprint cost across providers')
    .option('-t, --tokens <n>', 'Estimated total tokens per sprint', '500000')
    .action(async (opts) => {
    const { ProviderRegistry } = await import('../../providers/index.js');
    const registry = new ProviderRegistry();
    const configPath = path.join(KRATOS_ROOT, '_config', 'providers.yaml');
    await registry.init(configPath);
    const totalTokens = parseInt(opts.tokens);
    const inputTokens = Math.round(totalTokens * 0.7);
    const outputTokens = Math.round(totalTokens * 0.3);
    console.log(`Sprint Cost Estimate (${totalTokens.toLocaleString()} tokens):\n`);
    for (const tier of ['fast', 'standard', 'deep_reasoning']) {
        const estimates = registry.estimateCost(inputTokens, outputTokens, tier);
        console.log(`  ${tier}:`);
        for (const [provider, amount] of Object.entries(estimates)) {
            console.log(`    ${provider}: $${amount.toFixed(4)}`);
        }
    }
});
// ============================================================
// COST COMMANDS
// ============================================================
const cost = program.command('cost').description('Cost tracking and routing');
cost
    .command('report')
    .description('Show cost report')
    .option('-p, --period <period>', 'Time period: today, week, month, all', 'today')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { BudgetTracker } = await import('../../providers/budget-tracker.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const tracker = new BudgetTracker(mm);
    const report = await tracker.getSpend(opts.period);
    console.log(tracker.formatReport(report));
    await mm.close();
});
cost
    .command('route <workflow>')
    .description('Preview routing decision for a workflow')
    .action(async (workflow) => {
    const { CostRouter } = await import('../../providers/cost-router.js');
    const router = new CostRouter();
    const decision = router.route(workflow);
    console.log(router.formatDecision(decision));
});
cost
    .command('savings')
    .description('Show savings vs all-Opus baseline')
    .option('-p, --period <period>', 'Time period: today, week, month, all', 'month')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { BudgetTracker } = await import('../../providers/budget-tracker.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const tracker = new BudgetTracker(mm);
    const savings = await tracker.calculateSavings(opts.period);
    console.log(`Cost Savings (${opts.period}):`);
    console.log(`  Actual cost:    $${savings.actual_cost.toFixed(4)}`);
    console.log(`  Opus baseline:  $${savings.opus_baseline.toFixed(4)}`);
    console.log(`  Savings:        $${savings.savings.toFixed(4)} (${savings.savings_pct.toFixed(1)}%)`);
    await mm.close();
});
// ============================================================
// VALIDATE COMMANDS
// ============================================================
const validate = program.command('validate').description('Artifact validation');
validate
    .command('artifact <path>')
    .description('Validate artifact claims against ground truth')
    .action(async (artifactPath) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { GroundTruth } = await import('../../intelligence/validation/ground-truth.js');
    const { Validator } = await import('../../intelligence/validation/validator.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const gt = new GroundTruth(mm, PROJECT_ROOT);
    await gt.refresh();
    const validator = new Validator(gt);
    const resolvedPath = path.resolve(artifactPath);
    const report = await validator.validate(resolvedPath);
    console.log(validator.formatReport(report));
    await mm.close();
    process.exit(report.pass ? 0 : 1);
});
validate
    .command('refresh-ground-truth')
    .description('Rescan filesystem and update ground truth')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { GroundTruth } = await import('../../intelligence/validation/ground-truth.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const gt = new GroundTruth(mm, PROJECT_ROOT);
    const result = await gt.refresh();
    console.log(`Ground truth refreshed:`);
    console.log(`  Facts stored: ${result.facts_stored}`);
    for (const [category, count] of Object.entries(result.categories)) {
        console.log(`  ${category}: ${count}`);
    }
    await mm.close();
});
validate
    .command('ground-truth')
    .description('Show cached ground truth facts')
    .option('-c, --category <cat>', 'Filter by category: file, dependency, config, structure')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { GroundTruth } = await import('../../intelligence/validation/ground-truth.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const gt = new GroundTruth(mm, PROJECT_ROOT);
    const facts = await gt.getFacts(opts.category);
    if (facts.length === 0) {
        console.log('No ground truth facts found. Run: kratos validate refresh-ground-truth');
    }
    else {
        console.log(`Ground Truth Facts (${facts.length}):\n`);
        const grouped = {};
        for (const f of facts) {
            if (!grouped[f.category])
                grouped[f.category] = [];
            grouped[f.category].push(f);
        }
        for (const [category, items] of Object.entries(grouped)) {
            console.log(`  ${category} (${items.length}):`);
            for (const item of items.slice(0, 20)) {
                console.log(`    ${item.key}: ${item.value}`);
            }
            if (items.length > 20)
                console.log(`    ... and ${items.length - 20} more`);
            console.log('');
        }
    }
    await mm.close();
});
// ============================================================
// STATUS COMMAND
// ============================================================
program
    .command('status')
    .description('Show current sprint status + agent health')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const stats = await mm.getStats();
    console.log('Kratos Status:');
    console.log(`  Memory entries: ${stats.total_entries}`);
    console.log(`  Stale entries: ${stats.stale_count}`);
    const statusPath = path.join(PROJECT_ROOT, 'docs', 'implementation-artifacts', 'sprint-status.yaml');
    if (fs.existsSync(statusPath)) {
        console.log(`  Sprint status: ${statusPath}`);
    }
    else {
        console.log('  Sprint status: No active sprint');
    }
    await mm.close();
});
// ============================================================
// DOCTOR COMMAND
// ============================================================
program
    .command('doctor')
    .description('System health check')
    .action(async () => {
    const checks = [];
    // Node.js version
    const nodeVersion = process.version.replace('v', '');
    const major = parseInt(nodeVersion.split('.')[0]);
    checks.push({
        name: 'Node.js >= 18',
        passed: major >= 18,
        detail: `v${nodeVersion}`,
    });
    // _kratos/ directory
    checks.push({
        name: '_kratos/ directory exists',
        passed: fs.existsSync(KRATOS_ROOT),
        detail: KRATOS_ROOT,
    });
    // global.yaml
    const globalYamlPath = path.join(KRATOS_ROOT, '_config', 'global.yaml');
    checks.push({
        name: 'global.yaml is readable',
        passed: fs.existsSync(globalYamlPath),
        detail: globalYamlPath,
    });
    // Intelligence module
    checks.push({
        name: 'Intelligence module exists',
        passed: fs.existsSync(path.join(KRATOS_ROOT, 'intelligence', 'index.ts')),
        detail: path.join(KRATOS_ROOT, 'intelligence/'),
    });
    // sql.js
    let sqlJsInstalled = false;
    try {
        require.resolve('sql.js');
        sqlJsInstalled = true;
    }
    catch { /* not installed */ }
    checks.push({
        name: 'sql.js installed',
        passed: sqlJsInstalled,
        detail: sqlJsInstalled ? 'OK' : 'Run: npm install sql.js',
    });
    // Memory directory
    const memoryDir = path.join(KRATOS_ROOT, '_memory');
    checks.push({
        name: 'Memory directory exists',
        passed: fs.existsSync(memoryDir),
        detail: memoryDir,
    });
    // Phase 1 checkpoint
    const phase1Checkpoint = path.join(CHECKPOINT_DIR, 'upgrade-phase-1.yaml');
    checks.push({
        name: 'Phase 1 checkpoint',
        passed: fs.existsSync(phase1Checkpoint),
        detail: fs.existsSync(phase1Checkpoint) ? 'Completed' : 'Not found',
    });
    // Phase 3: providers.yaml
    const providersYamlPath = path.join(KRATOS_ROOT, '_config', 'providers.yaml');
    checks.push({
        name: 'providers.yaml exists',
        passed: fs.existsSync(providersYamlPath),
        detail: fs.existsSync(providersYamlPath) ? 'OK' : 'Missing — Phase 3 not installed',
    });
    // Phase 3: optional deps
    const optDeps = ['@anthropic-ai/sdk', 'openai', '@google/generative-ai'];
    for (const dep of optDeps) {
        let installed = false;
        try {
            require.resolve(dep);
            installed = true;
        }
        catch { /* optional */ }
        checks.push({
            name: `${dep} (optional)`,
            passed: true, // optional deps don't fail the check
            detail: installed ? 'Installed' : 'Not installed (optional)',
        });
    }
    // Phase 3 checkpoint
    const phase3Checkpoint = path.join(CHECKPOINT_DIR, 'upgrade-phase-3.yaml');
    checks.push({
        name: 'Phase 3 checkpoint',
        passed: fs.existsSync(phase3Checkpoint),
        detail: fs.existsSync(phase3Checkpoint) ? 'Completed' : 'Not found',
    });
    // Phase 4: observability modules
    checks.push({
        name: 'Observability metrics module',
        passed: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'metrics', 'index.ts')),
        detail: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'metrics', 'index.ts')) ? 'OK' : 'Missing',
    });
    checks.push({
        name: 'Observability codebase module',
        passed: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'codebase', 'index.ts')),
        detail: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'codebase', 'index.ts')) ? 'OK' : 'Missing',
    });
    checks.push({
        name: 'Observability plugins module',
        passed: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'plugins', 'index.ts')),
        detail: fs.existsSync(path.join(KRATOS_ROOT, 'observability', 'plugins', 'index.ts')) ? 'OK' : 'Missing',
    });
    checks.push({
        name: 'plugins.yaml exists',
        passed: fs.existsSync(path.join(KRATOS_ROOT, '_config', 'plugins.yaml')),
        detail: fs.existsSync(path.join(KRATOS_ROOT, '_config', 'plugins.yaml')) ? 'OK' : 'Missing',
    });
    // Phase 4 checkpoint
    const phase4Checkpoint = path.join(CHECKPOINT_DIR, 'upgrade-phase-4.yaml');
    checks.push({
        name: 'Phase 4 checkpoint',
        passed: fs.existsSync(phase4Checkpoint),
        detail: fs.existsSync(phase4Checkpoint) ? 'Completed' : 'Not found',
    });
    console.log('Kratos Health Check:\n');
    let allPassed = true;
    for (const check of checks) {
        const icon = check.passed ? 'PASS' : 'FAIL';
        console.log(`  [${icon}] ${check.name} — ${check.detail}`);
        if (!check.passed)
            allPassed = false;
    }
    console.log(`\n${allPassed ? 'All checks passed.' : 'Some checks failed.'}`);
    process.exit(allPassed ? 0 : 1);
});
// ============================================================
// DASHBOARD COMMAND
// ============================================================
program
    .command('dashboard')
    .description('Launch web dashboard')
    .option('-p, --port <n>', 'Port number', '3456')
    .action(async (opts) => {
    const { spawn } = await import('child_process');
    const dashboardDir = path.join(PROJECT_ROOT, 'dashboard');
    if (!fs.existsSync(dashboardDir)) {
        console.error('Dashboard directory not found.');
        process.exit(1);
    }
    console.log(`Launching dashboard on port ${opts.port}...`);
    const child = spawn('npm', ['start'], {
        cwd: dashboardDir,
        stdio: 'inherit',
        env: { ...process.env, PORT: opts.port },
    });
    child.on('error', (err) => console.error('Failed to start dashboard:', err.message));
});
// ============================================================
// HOOKS COMMANDS
// ============================================================
const hooks = program.command('hooks').description('Manage lifecycle hooks');
hooks
    .command('list')
    .description('List all configured hooks')
    .action(async () => {
    const { HookExecutor } = await import('./hook-executor.js');
    const hooksConfigPath = path.join(KRATOS_ROOT, '_config', 'hooks.yaml');
    const executor = new HookExecutor(hooksConfigPath);
    await executor.loadConfig();
    const allHooks = executor.listHooks();
    for (const [point, defs] of Object.entries(allHooks)) {
        const hookDefs = defs;
        const count = hookDefs.length;
        console.log(`${point}: ${count === 0 ? '(none)' : `${count} hook(s)`}`);
        for (const def of hookDefs) {
            console.log(`  → ${def.command} [on_fail: ${def.on_fail}]`);
        }
    }
});
hooks
    .command('test <hookPoint>')
    .description('Test-fire a hook point with sample context')
    .action(async (hookPoint) => {
    const { HookExecutor } = await import('./hook-executor.js');
    const hooksConfigPath = path.join(KRATOS_ROOT, '_config', 'hooks.yaml');
    const executor = new HookExecutor(hooksConfigPath);
    await executor.loadConfig();
    console.log(`Testing hook point: ${hookPoint}`);
    const results = await executor.execute(hookPoint, {
        workflow_name: 'test',
        step_number: 1,
        story_key: 'TEST-001',
    });
    if (results.length === 0) {
        console.log('No hooks configured for this point.');
    }
    else {
        for (const r of results) {
            console.log(`  [${r.exit_code === 0 ? 'OK' : 'ERR'}] ${r.command} (${r.duration_ms}ms) → ${r.action_taken}`);
        }
    }
});
// ============================================================
// METRICS COMMANDS (Phase 4)
// ============================================================
const metrics = program.command('metrics').description('Observability metrics');
metrics
    .command('sprint')
    .description('Show sprint velocity, cycle time, burndown, and health')
    .option('-s, --status <path>', 'Sprint status file path')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { SprintMetrics } = await import('../../observability/metrics/sprint-metrics.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const statusPath = opts.status || path.join(PROJECT_ROOT, 'docs', 'implementation-artifacts', 'sprint-status.yaml');
    const sm = new SprintMetrics(mm);
    try {
        const report = sm.calculate(statusPath);
        sm.recordMetrics(report);
        console.log(sm.formatReport(report));
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
    await mm.close();
});
metrics
    .command('agents')
    .description('Show agent leaderboard with pass rates and learning trends')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { AgentMetrics } = await import('../../observability/metrics/agent-metrics.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const am = new AgentMetrics(mm);
    const report = am.calculate();
    am.recordMetrics(report);
    console.log(am.formatReport(report));
    await mm.close();
});
metrics
    .command('quality')
    .description('Show first-pass rate, gate pass rates, and quality score')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { QualityMetrics } = await import('../../observability/metrics/quality-metrics.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const qm = new QualityMetrics(mm);
    const report = qm.calculate();
    qm.recordMetrics(report);
    console.log(qm.formatReport(report));
    await mm.close();
});
metrics
    .command('cost')
    .description('Show cost per story, tier distribution, savings, and forecast')
    .option('-p, --period <period>', 'Time period: today, week, month, all', 'month')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { CostMetrics } = await import('../../observability/metrics/cost-metrics.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const cm = new CostMetrics(mm);
    const report = cm.calculate(opts.period);
    cm.recordMetrics(report);
    console.log(cm.formatReport(report));
    await mm.close();
});
metrics
    .command('export')
    .description('Export all metrics as JSON')
    .option('-t, --type <type>', 'Filter by metric type')
    .option('-o, --output <file>', 'Output file path')
    .action(async (opts) => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { MetricsCollector } = await import('../../observability/metrics/collector.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const mc = new MetricsCollector(mm);
    const data = mc.exportJson({ metric_type: opts.type });
    if (opts.output) {
        fs.writeFileSync(opts.output, JSON.stringify(data, null, 2));
        console.log(`Exported ${data.length} metrics to ${opts.output}`);
    }
    else {
        console.log(JSON.stringify(data, null, 2));
    }
    await mm.close();
});
// ============================================================
// CODEBASE COMMANDS (Phase 4)
// ============================================================
const codebase = program.command('codebase').description('Codebase intelligence');
codebase
    .command('scan')
    .description('Run incremental codebase scan with checksums')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { CodebaseScanner } = await import('../../observability/codebase/scanner.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const scanner = new CodebaseScanner(mm, PROJECT_ROOT);
    const result = scanner.scan();
    console.log(scanner.formatReport(result));
    await mm.close();
});
codebase
    .command('drift')
    .description('Detect architecture doc vs reality drift')
    .action(async () => {
    const { DriftDetector } = await import('../../observability/codebase/drift-detector.js');
    const detector = new DriftDetector(PROJECT_ROOT);
    const report = detector.detect();
    console.log(detector.formatReport(report));
    process.exit(report.drift_score > 50 ? 1 : 0);
});
codebase
    .command('debt')
    .description('Detect technical debt: complexity, size, test gaps')
    .action(async () => {
    const { DebtTracker } = await import('../../observability/codebase/debt-tracker.js');
    const tracker = new DebtTracker(PROJECT_ROOT);
    const report = tracker.analyze();
    console.log(tracker.formatReport(report));
});
codebase
    .command('hotspots')
    .description('Show files with most issues and changes')
    .action(async () => {
    const { DebtTracker } = await import('../../observability/codebase/debt-tracker.js');
    const tracker = new DebtTracker(PROJECT_ROOT);
    const report = tracker.analyze();
    console.log('Codebase Hotspots');
    console.log('='.repeat(50));
    console.log('');
    if (report.hotspots.length === 0) {
        console.log('No hotspots detected.');
    }
    else {
        for (const h of report.hotspots) {
            console.log(`  ${h.file}: ${h.issues} issues`);
        }
    }
});
codebase
    .command('ownership')
    .description('Show file-to-story-to-agent ownership map')
    .action(async () => {
    const { OwnershipMap } = await import('../../observability/codebase/ownership-map.js');
    const ownership = new OwnershipMap(CHECKPOINT_DIR);
    const report = ownership.build();
    console.log(ownership.formatReport(report));
});
codebase
    .command('stats')
    .description('Show codebase size and language breakdown')
    .action(async () => {
    const { MemoryManager } = await import('../../intelligence/memory/memory-manager.js');
    const { CodebaseScanner } = await import('../../observability/codebase/scanner.js');
    const mm = new MemoryManager(MEMORY_DB_PATH);
    await mm.init();
    const scanner = new CodebaseScanner(mm, PROJECT_ROOT);
    const stats = scanner.getStats();
    console.log('Codebase Stats');
    console.log('='.repeat(50));
    console.log(`  Total files: ${stats.total_files}`);
    console.log(`  Total lines: ${stats.total_lines.toLocaleString()}`);
    console.log('');
    console.log('By Language:');
    const sorted = Object.entries(stats.by_language).sort((a, b) => b[1] - a[1]);
    for (const [lang, count] of sorted) {
        console.log(`  ${lang}: ${count} files`);
    }
    await mm.close();
});
// ============================================================
// PLUGINS COMMANDS (Phase 4)
// ============================================================
const plugins = program.command('plugins').description('Plugin management');
plugins
    .command('list')
    .description('List all discovered and registered plugins')
    .action(async () => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const { PluginRegistry } = await import('../../observability/plugins/plugin-registry.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const loader = new PluginLoader(pluginsDir, manifest);
    const registry = new PluginRegistry(manifest, loader);
    const allPlugins = registry.discoverAndList();
    console.log(registry.formatList(allPlugins));
});
plugins
    .command('discover')
    .description('Scan plugins directory for unregistered plugins')
    .action(async () => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const loader = new PluginLoader(pluginsDir, manifest);
    const discovered = loader.discover();
    if (discovered.length === 0) {
        console.log('No plugins discovered.');
    }
    else {
        console.log(`Discovered ${discovered.length} plugin(s):`);
        for (const p of discovered) {
            console.log(`  ${p.name} (${p.type}) — ${p.has_manifest ? 'has manifest' : 'no manifest'}`);
        }
    }
});
plugins
    .command('validate <name>')
    .description('Validate a plugin definition')
    .action(async (name) => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const plugin = manifest.getPlugin(name);
    if (!plugin) {
        console.error(`Plugin not found: ${name}`);
        process.exit(1);
    }
    const loader = new PluginLoader(pluginsDir, manifest);
    const result = loader.validate(plugin);
    console.log(`Validation for ${name}: ${result.valid ? 'VALID' : 'INVALID'}`);
    if (result.errors.length > 0) {
        console.log('Errors:');
        for (const e of result.errors)
            console.log(`  ${e}`);
    }
    if (result.warnings.length > 0) {
        console.log('Warnings:');
        for (const w of result.warnings)
            console.log(`  ${w}`);
    }
    process.exit(result.valid ? 0 : 1);
});
plugins
    .command('enable <name>')
    .description('Enable a registered plugin')
    .action(async (name) => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const { PluginRegistry } = await import('../../observability/plugins/plugin-registry.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const loader = new PluginLoader(pluginsDir, manifest);
    const registry = new PluginRegistry(manifest, loader);
    const result = registry.enable(name);
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
});
plugins
    .command('disable <name>')
    .description('Disable a registered plugin')
    .action(async (name) => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const { PluginRegistry } = await import('../../observability/plugins/plugin-registry.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const loader = new PluginLoader(pluginsDir, manifest);
    const registry = new PluginRegistry(manifest, loader);
    const result = registry.disable(name);
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
});
plugins
    .command('create <name>')
    .description('Create a new plugin scaffold')
    .option('-t, --type <type>', 'Plugin type: agent, workflow, skill, task, hook', 'agent')
    .action(async (name, opts) => {
    const { PluginManifest } = await import('../../observability/plugins/plugin-manifest.js');
    const { PluginLoader } = await import('../../observability/plugins/plugin-loader.js');
    const { PluginRegistry } = await import('../../observability/plugins/plugin-registry.js');
    const configPath = path.join(KRATOS_ROOT, '_config', 'plugins.yaml');
    const pluginsDir = path.join(KRATOS_ROOT, 'plugins');
    const manifest = new PluginManifest(configPath);
    manifest.load();
    const loader = new PluginLoader(pluginsDir, manifest);
    const registry = new PluginRegistry(manifest, loader);
    const validTypes = ['agent', 'workflow', 'skill', 'task', 'hook'];
    if (!validTypes.includes(opts.type)) {
        console.error(`Invalid type: ${opts.type}. Must be one of: ${validTypes.join(', ')}`);
        process.exit(1);
    }
    const result = registry.create(name, opts.type);
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
});
// ============================================================
// CONTEXT COMMANDS (Phase 4)
// ============================================================
const context = program.command('context').description('Context optimization');
context
    .command('build')
    .description('Pre-compile agent context caches')
    .action(async () => {
    const { ContextCache } = await import('../engine/context-cache.js');
    const cache = new ContextCache(KRATOS_ROOT);
    const contexts = cache.buildAll();
    console.log(`Built context caches for ${contexts.length} agent(s).`);
    for (const ctx of contexts) {
        console.log(`  ${ctx.agent_id}: ${ctx.estimated_tokens.toLocaleString()} tokens (${ctx.total_lines} lines)`);
    }
});
context
    .command('stats')
    .description('Show context cache statistics and savings estimate')
    .action(async () => {
    const { ContextCache } = await import('../engine/context-cache.js');
    const cache = new ContextCache(KRATOS_ROOT);
    const stats = cache.getStats();
    console.log(cache.formatStats(stats));
});
context
    .command('invalidate')
    .description('Clear all context caches')
    .action(async () => {
    const { ContextCache } = await import('../engine/context-cache.js');
    const cache = new ContextCache(KRATOS_ROOT);
    const count = cache.invalidate();
    console.log(`Invalidated ${count} cache file(s).`);
});
context
    .command('budget [agentId]')
    .description('Check if an agent context fits within the 40K token budget')
    .action(async (agentId) => {
    const { ContextCache } = await import('../engine/context-cache.js');
    const cache = new ContextCache(KRATOS_ROOT);
    if (agentId) {
        const result = cache.checkBudget(agentId);
        console.log(`Budget check for ${agentId}:`);
        console.log(`  Tokens:  ${result.tokens.toLocaleString()}`);
        console.log(`  Budget:  ${result.budget.toLocaleString()}`);
        console.log(`  Fits:    ${result.fits ? 'YES' : 'NO'}`);
        if (result.overage > 0) {
            console.log(`  Overage: ${result.overage.toLocaleString()} tokens`);
        }
    }
    else {
        const stats = cache.getStats();
        console.log(`Context budget: ${stats.budget_max.toLocaleString()} tokens`);
        console.log(`Max usage:      ${stats.budget_used_pct.toFixed(1)}%`);
        console.log(`Agents cached:  ${stats.agents_cached}`);
    }
});
context
    .command('skill-sections [skillName]')
    .description('List skill sections available for JIT loading')
    .action(async (skillName) => {
    const { SkillIndex } = await import('../engine/skill-index.js');
    const skillsDir = path.join(KRATOS_ROOT, 'dev', 'skills');
    const cacheDir = path.join(KRATOS_ROOT, '.cache', 'skills');
    const idx = new SkillIndex(skillsDir, cacheDir);
    if (skillName) {
        const sections = idx.listSections(skillName);
        if (sections.length === 0) {
            console.log(`No sections found for skill: ${skillName}`);
        }
        else {
            console.log(`Sections for ${skillName}:`);
            for (const s of sections) {
                console.log(`  ${s.heading} (${s.line_count} lines)`);
            }
        }
    }
    else {
        const index = idx.build();
        console.log(idx.formatIndex(index));
    }
});
program.parse();
//# sourceMappingURL=cli.js.map