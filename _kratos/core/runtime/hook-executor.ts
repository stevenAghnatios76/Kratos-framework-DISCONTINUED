import { execSync } from 'child_process';
import * as fs from 'fs';
import * as yaml from 'yaml';

export interface HookDefinition {
  command: string;
  on_fail: 'halt' | 'warn' | 'skip';
  timeout?: number;
  condition?: string;
  env?: Record<string, string>;
}

export interface HookContext {
  workflow_name?: string;
  step_number?: number;
  gate_name?: string;
  gate_result?: string;
  review_type?: string;
  review_result?: string;
  agent_id?: string;
  story_key?: string;
  error_message?: string;
  files_modified?: string[];
  score?: number;
  [key: string]: unknown;
}

export interface HookResult {
  hook_point: string;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  duration_ms: number;
  action_taken: 'continued' | 'warned' | 'halted';
}

export class HaltError extends Error {
  constructor(hookPoint: string, command: string, stderr: string) {
    super(`Hook halted workflow at ${hookPoint}: ${command}\n${stderr}`);
    this.name = 'HaltError';
  }
}

export class HookExecutor {
  private hooks: Record<string, HookDefinition[]> = {};
  private configPath: string;

  constructor(hooksConfigPath: string) {
    this.configPath = hooksConfigPath;
  }

  async loadConfig(): Promise<void> {
    if (!fs.existsSync(this.configPath)) {
      this.hooks = {};
      return;
    }

    const content = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = yaml.parse(content);
    this.hooks = parsed?.hooks || {};

    // Normalize: ensure all values are arrays
    for (const [key, value] of Object.entries(this.hooks)) {
      if (!Array.isArray(value)) {
        this.hooks[key] = [];
      }
    }
  }

  async execute(hookPoint: string, context: HookContext): Promise<HookResult[]> {
    const hookDefs = this.hooks[hookPoint];
    if (!hookDefs || hookDefs.length === 0) return [];

    const results: HookResult[] = [];

    for (const hook of hookDefs) {
      // Check condition if present
      if (hook.condition && !this.evaluateCondition(hook.condition, context)) {
        continue;
      }

      const resolvedCommand = this.resolveCommand(hook.command, context);
      const timeout = (hook.timeout || 30) * 1000;
      const startTime = Date.now();

      let exitCode = 0;
      let stdout = '';
      let stderr = '';

      try {
        const output = execSync(resolvedCommand, {
          timeout,
          encoding: 'utf-8',
          env: { ...process.env, ...hook.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        stdout = output || '';
      } catch (err: unknown) {
        const execErr = err as { status?: number; stdout?: string; stderr?: string };
        exitCode = execErr.status || 1;
        stdout = execErr.stdout || '';
        stderr = execErr.stderr || '';
      }

      const durationMs = Date.now() - startTime;
      let actionTaken: HookResult['action_taken'] = 'continued';

      if (exitCode !== 0) {
        switch (hook.on_fail) {
          case 'halt':
            actionTaken = 'halted';
            results.push({
              hook_point: hookPoint,
              command: resolvedCommand,
              exit_code: exitCode,
              stdout,
              stderr,
              duration_ms: durationMs,
              action_taken: actionTaken,
            });
            throw new HaltError(hookPoint, resolvedCommand, stderr);

          case 'warn':
            actionTaken = 'warned';
            console.warn(`[hook:${hookPoint}] Warning: ${resolvedCommand} exited with code ${exitCode}`);
            if (stderr) console.warn(`  ${stderr.split('\n')[0]}`);
            break;

          case 'skip':
            actionTaken = 'continued';
            break;
        }
      }

      results.push({
        hook_point: hookPoint,
        command: resolvedCommand,
        exit_code: exitCode,
        stdout,
        stderr,
        duration_ms: durationMs,
        action_taken: actionTaken,
      });
    }

    return results;
  }

  private resolveCommand(command: string, context: HookContext): string {
    return command.replace(/\{(\w+)\}/g, (match, key) => {
      const value = context[key];
      if (value === undefined || value === null) return match;
      if (Array.isArray(value)) return value.join(' ');
      return String(value);
    });
  }

  private evaluateCondition(condition: string, context: HookContext): boolean {
    // Simple condition evaluation: "key.exists" or "key.equals:value"
    const parts = condition.split('.');
    if (parts.length < 2) return true;

    const key = parts[0];
    const check = parts.slice(1).join('.');

    const value = context[key];

    if (check === 'exists') return value !== undefined && value !== null;
    if (check.startsWith('equals:')) {
      const expected = check.substring(7);
      return String(value) === expected;
    }
    if (check === 'has_tests') return true; // Default assumption

    return true;
  }

  addHook(hookPoint: string, hook: HookDefinition): void {
    if (!this.hooks[hookPoint]) this.hooks[hookPoint] = [];
    this.hooks[hookPoint].push(hook);
  }

  removeHook(hookPoint: string, index: number): void {
    if (this.hooks[hookPoint] && index < this.hooks[hookPoint].length) {
      this.hooks[hookPoint].splice(index, 1);
    }
  }

  listHooks(): Record<string, HookDefinition[]> {
    return { ...this.hooks };
  }
}
