#!/usr/bin/env python3

import argparse
import os
import sys
import re
import io
import time
from collections import defaultdict
from typing import List, Set, Tuple, Dict, Optional

# --- Configuration ---
LICENSE_TEXT = r"""/**
 * @license
 * MIT License
 *
 * Copyright (c) 2025 dream
 *
 * This software, "dream", is a fork of Google's material-color-utilities
 * (https://github.com/material-foundation/material-color-utilities).
 * While based on and incorporating concepts and code from the original
 * material-color-utilities project, "hctjs" is maintained and distributed
 * under the terms of the MIT License as set forth below.
 *
 * The original material-color-utilities project is licensed under the
 * Apache License 2.0.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice, including the
 * acknowledgement of the original material-color-utilities project, shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
"""

# --- Minimal Test Harness Code (Using Raw String, isNot is now public) ---
TEST_HARNESS_CODE = r"""
// --- Minimal Test Harness Emulation ---
const log = console.log;
const error = console.error;

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

interface TestResult { suite: string; name: string; passed: boolean; error?: Error | string; }
interface TestSuite { name: string; beforeEachFn: (() => void) | null; tests: { name: string; fn: () => void | Promise<void> }[]; childSuites: TestSuite[]; }

const runnerState = {
  suites: [] as TestSuite[],
  currentSuiteStack: [] as TestSuite[],
  results: [] as TestResult[],
  totalTests: 0, passed: 0, failed: 0,
  currentCustomMatchers: {} as Record<string, (this: ExpectContext, ...args: any[]) => { pass: boolean, message?: string }>,
};

function describe(name: string, suiteFn: () => void): void {
  const newSuite: TestSuite = { name: name, beforeEachFn: null, tests: [], childSuites: [] };
  const parentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (parentSuite) { parentSuite.childSuites.push(newSuite); } else { runnerState.suites.push(newSuite); }
  runnerState.currentSuiteStack.push(newSuite);
  try { suiteFn(); } catch (e) { error(`Error during describe setup for "${name}":`, e); } finally { runnerState.currentSuiteStack.pop(); }
}

function it(name: string, testFn: () => void | Promise<void>): void {
  const currentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (!currentSuite) { error(`"it(${name})" called outside of a "describe" block. Test ignored.`); return; }
  currentSuite.tests.push({ name, fn: testFn });
}

function beforeEach(fn: () => void): void {
  const currentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (!currentSuite) { error(`"beforeEach" called outside of a "describe" block. Ignored.`); return; }
  if (currentSuite.beforeEachFn) { return; } // Keep first one defined in scope
  currentSuite.beforeEachFn = fn;
}

function fail(message?: string): never { throw new AssertionError(`Explicit failure${message ? `: ${message}`: ''}`); }

class ExpectContext {
  // *** CHANGED: isNot is now public (or default access) ***
  constructor(public actual: any, public isNot: boolean = false) {}

  get not(): ExpectContext { return new ExpectContext(this.actual, !this.isNot); }

  private check(passCondition: boolean, message: string) { if (passCondition === this.isNot) { throw new AssertionError(message); } }

  toBe(expected: any): void { const pass = Object.is(this.actual, expected); this.check(pass, `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be (strictly equal) ${String(expected)}`); }
  toEqual(expected: any): void { const pass = deepEqual(this.actual, expected); const aStr = safeStringify(this.actual); const eStr = safeStringify(expected); this.check(pass, `Expected ${aStr} ${this.isNot ? 'not ' : ''}to equal ${eStr}`); }
  toBeCloseTo(expected: number, precision: number = 2): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') { throw new AssertionError(`Type mismatch: toBeCloseTo numbers`); } const tolerance = Math.pow(10, -precision) / 2; const pass = Math.abs(this.actual - expected) < tolerance; this.check(pass, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be close to ${expected} (precision ${precision})`); }
  toBeTrue(): void { this.check(this.actual === true, `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be true`); }
  toBeFalse(): void { this.check(this.actual === false, `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be false`); }
  toBeLessThan(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') { throw new AssertionError(`Type mismatch: toBeLessThan numbers`); } this.check(this.actual < expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be less than ${expected}`); }
  toBeLessThanOrEqual(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') { throw new AssertionError(`Type mismatch: toBeLessThanOrEqual numbers`); } this.check(this.actual <= expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be less than or equal to ${expected}`); }
  toBeGreaterThan(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') { throw new AssertionError(`Type mismatch: toBeGreaterThan numbers`); } this.check(this.actual > expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be greater than ${expected}`); }
  toBeGreaterThanOrEqual(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') { throw new AssertionError(`Type mismatch: toBeGreaterThanOrEqual numbers`); } this.check(this.actual >= expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be greater than or equal to ${expected}`); }
  toThrow(expectedError?: string | RegExp | Error | (new (...args: any[]) => Error)): void { if (typeof this.actual !== 'function') { throw new AssertionError('Expected function for toThrow()'); } let didThrow = false; let thrownError: any = null; try { this.actual(); } catch (e) { didThrow = true; thrownError = e; } let pass = didThrow; let msg = `Expected function ${this.isNot ? 'not ' : ''}to throw`; if (didThrow && expectedError !== undefined) { const errStr = thrownError?.message || String(thrownError); if (expectedError instanceof RegExp) { pass = expectedError.test(errStr); msg = `Expected function ${this.isNot ? 'not ' : ''}to throw matching regex ${expectedError}. Got: "${errStr}"`; } else if (typeof expectedError === 'string') { pass = errStr.includes(expectedError); msg = `Expected function ${this.isNot ? 'not ' : ''}to throw containing "${expectedError}". Got: "${errStr}"`; } else if (typeof expectedError === 'function' && thrownError instanceof expectedError) { pass = true; msg = `Expected function ${this.isNot ? 'not ' : ''}to throw type ${expectedError.name}. Got: ${thrownError?.constructor?.name}`; } else if (expectedError instanceof Error) { pass = thrownError === expectedError; msg = `Expected function ${this.isNot ? 'not ' : ''}to throw specific instance.`; } else { pass = false; msg = `Invalid expectedError for toThrow()`; } } else if (!didThrow && expectedError !== undefined) { pass = false; msg = `Expected function to throw matching ${expectedError}, but it did not throw.`; } this.check(pass, msg); }
  [key: string]: any; // Allow dynamic matcher methods
}

function expect(actual: any): ExpectContext {
  return new Proxy(new ExpectContext(actual), {
      get(target: ExpectContext, prop: string | symbol, receiver: any): any {
          if (prop === 'not') { return new Proxy(new ExpectContext(target.actual, !target.isNot), this); }
          if (prop in target || typeof prop === 'symbol') { return Reflect.get(target, prop, receiver); }
          if (typeof prop === 'string' && prop in runnerState.currentCustomMatchers) {
              const matcherFn = runnerState.currentCustomMatchers[prop];
              return (...args: any[]) => {
                  // Pass public `isNot` property via `this` context
                  const result = matcherFn.call(target, target.actual, ...args);
                  if (typeof result !== 'object' || typeof result.pass !== 'boolean') { throw new Error(`Custom matcher '${prop}' bad return`); }
                  const defaultMsg = `Custom matcher '${prop}' failed`;
                  const message = (typeof result.message === 'string' && result.message) || defaultMsg;
                  // Use the private check method to handle logic inversion and throwing
                  target['check'](result.pass, message);
              };
          }
          return Reflect.get(target, prop, receiver);
      }
  });
}

// --- Simple Deep Equal & Stringify ---
function deepEqual(a: any, b: any): boolean {
    if (a === b || Object.is(a, b)) return true;
    if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) && Array.isArray(b)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) { if (!deepEqual(a[i], b[i])) return false; } return true; }
    if (a instanceof Date && b instanceof Date) { return a.getTime() === b.getTime(); }
    if (a instanceof RegExp && b instanceof RegExp) { return a.toString() === b.toString(); }
    if (a.constructor === Object && b.constructor === Object) { const keysA = Object.keys(a).sort(); const keysB = Object.keys(b).sort(); if (keysA.length !== keysB.length || !deepEqual(keysA, keysB)) return false; for (const key of keysA) { if (!deepEqual(a[key], b[key])) return false; } return true; }
    return false;
}
function safeStringify(obj: any): string { try { return JSON.stringify(obj) ?? String(obj); } catch { return String(obj); } }

// --- Custom Matchers ---
function numberToHex(n: number): string { if (typeof n !== 'number' || !Number.isInteger(n)) return String(n); return `#${(n >>> 0).toString(16).toUpperCase().padStart(8, '0')}`; }
const customMatchersImpl = {
  matchesColor: function(this: ExpectContext, actual: unknown, expected: unknown): { pass: boolean; message?: string } {
    if (typeof actual !== 'number' || typeof expected !== 'number') { return { pass: false, message: `Expected numbers for matchesColor` }; }
    const actualRounded = Math.round(actual); const expectedRounded = Math.round(expected);
    const pass = Object.is(actualRounded, expectedRounded);
    // *** USES PUBLIC this.isNot ***
    const msg = this.isNot ? `Expected ${numberToHex(actualRounded)} not to match ${numberToHex(expectedRounded)}` : `Expected ${numberToHex(actualRounded)} to match ${numberToHex(expectedRounded)}`;
    return { pass: pass, message: msg };
  }
};

// --- Test Execution ---
async function runTests(suitesToRun: TestSuite[], parentSuiteName: string = '', currentBeforeEach: (() => void) | null = null) {
    for (const suite of suitesToRun) {
        const fullSuiteName = parentSuiteName ? `${parentSuiteName} > ${suite.name}` : suite.name;
        log(`\nRUNNING SUITE: ${fullSuiteName}`);
        const suiteBeforeEach = suite.beforeEachFn || currentBeforeEach;
        if (suite.tests.length > 0) { log(`  Tests (${suite.tests.length}):`); }

        for (const test of suite.tests) {
            runnerState.totalTests++; let testPassed = false; let testError: Error | string | undefined = undefined;
            try {
                if (suiteBeforeEach) { try { suiteBeforeEach(); } catch (beError: any) { throw new Error(`beforeEach failed: ${String(beError)}`); } } // Throw ensures test doesn't run
                const result = test.fn(); if (result instanceof Promise) { await result; }
                testPassed = true; log(`    [PASS] ${test.name}`);
            } catch (e: any) { testPassed = false; testError = e instanceof Error ? e : new Error(String(e)); error(`    [FAIL] ${test.name}`); const errMsg = testError instanceof AssertionError ? testError.message : (testError.stack || String(testError)); error(`      ${errMsg.split('\n')[0]}`); // Show first line
            } finally { runnerState.results.push({ suite: fullSuiteName, name: test.name, passed: testPassed, error: testError }); if (testPassed) runnerState.passed++; else runnerState.failed++; }
        }
        if (suite.childSuites.length > 0) { await runTests(suite.childSuites, fullSuiteName, suiteBeforeEach); }
    }
}

async function runAllTestsAndReport() {
    log('--- Starting Minimal Test Run ---');
    runnerState.results = []; runnerState.totalTests = 0; runnerState.passed = 0; runnerState.failed = 0;
    runnerState.currentCustomMatchers = {}; Object.assign(runnerState.currentCustomMatchers, customMatchersImpl);

    await runTests(runnerState.suites); // Assumes describe/it populated suites

    log('\n--- Test Summary ---');
    const total = runnerState.totalTests;
    if (total === 0) { log("No tests found or executed."); return; }
    const passedPercent = ((runnerState.passed / total) * 100).toFixed(1);
    const failedPercent = ((runnerState.failed / total) * 100).toFixed(1);
    log(`Total Tests Executed: ${total}`); log(`Passed: ${runnerState.passed} (${passedPercent}%)`); log(`Failed: ${runnerState.failed} (${failedPercent}%)`);

    if (runnerState.failed > 0) {
        error('\n--- Failures ---');
        runnerState.results.filter(r => !r.passed).forEach(f => { error(`Suite: ${f.suite}\n  Test: ${f.name}`); let errMsg = f.error instanceof Error ? (f.error.stack || f.error.message) : String(f.error); error(`  Error: ${errMsg}\n`); });

        // --- Exit Strategy (Works in Node and Browser) ---
        if (typeof process !== 'undefined' && process.exit) {
            log("Exiting with status 1 due to failures.");
            process.exit(1); // Use exit code for Node.js CI/automation
        } else {
             // Throwing an error halts script execution in browsers and signals failure
             throw new Error("Test run failed. See console for details.");
        }
    } else {
         log('\nAll tests passed!');
         // Optional: Exit 0 for Node.js success
         // if (typeof process !== 'undefined' && process.exit) { process.exit(0); }
    }
}
// --- End Minimal Test Harness Emulation ---
"""

# --- Other Python Config (Unchanged) ---
OUTPUT_DIR = "."
MAIN_OUTPUT_BASENAME = "cats"
TEST_OUTPUT_BASENAME = "cats_test"
TEST_FILE_SUFFIX = "_test.ts"
# --- End Configuration ---


# --- Python Helper Functions (Unchanged) ---
def find_ts_files(directory: str) -> Tuple[List[str], List[str]]:
    main_files, test_files = [], []
    abs_directory = os.path.abspath(directory)
    print(f"Scanning for .ts files in: {abs_directory}")
    for dirpath, dirnames, filenames in os.walk(abs_directory, topdown=True):
        dirnames[:] = [
            d
            for d in dirnames
            if d != "node_modules"
            and not d.startswith(".")
            and d != "dist"
            and d != "build"
        ]
        for filename in filenames:
            lower_filename = filename.lower()
            if lower_filename.endswith(".ts") and not lower_filename.endswith(".d.ts"):
                full_path = os.path.join(dirpath, filename)
                if lower_filename.endswith(TEST_FILE_SUFFIX):
                    test_files.append(full_path)
                else:
                    main_files.append(full_path)
    main_files.sort()
    test_files.sort()
    print(f"Found {len(main_files)} main files and {len(test_files)} test files.")
    return main_files, test_files


def create_section_header(relative_filepath: str) -> str:
    normalized_path = relative_filepath.replace(os.sep, "/")
    return f"\n\n// --- BEGIN FILE: {normalized_path} ---\n"


def create_section_footer(relative_filepath: str) -> str:
    normalized_path = relative_filepath.replace(os.sep, "/")
    return f"\n// --- END FILE: {normalized_path} ---\n"


def resolve_relative_path(
    source_file_abs_path: str, relative_import_path: str
) -> Optional[str]:
    source_dir = os.path.dirname(source_file_abs_path)
    try:
        norm_rel_path = relative_import_path.replace("\\", "/")
        target_base, ext = os.path.splitext(norm_rel_path)
        base_abs = os.path.abspath(os.path.join(source_dir, target_base))
        ts_path = base_abs + ".ts"
        if os.path.isfile(ts_path):
            return ts_path
        if os.path.isdir(base_abs):
            idx_path = os.path.join(base_abs, "index.ts")
            if os.path.isfile(idx_path):
                return idx_path
        if ext.lower() == ".js":  # Check .ts even if import used .js
            if os.path.isfile(ts_path):
                return ts_path
            if os.path.isdir(base_abs):
                idx_path = os.path.join(base_abs, "index.ts")
                if os.path.isfile(idx_path):
                    return idx_path
    except Exception as e:
        print(f"  [Warn] Resolving path '{relative_import_path}': {e}", file=sys.stderr)
    if relative_import_path.startswith("."):
        print(
            f"  [Warn] Cannot resolve relative import '{relative_import_path}' from '{os.path.basename(source_file_abs_path)}'",
            file=sys.stderr,
        )
    return None


# --- Regex Patterns (Unchanged) ---
LICENSE_BLOCK_PATTERN = re.compile(r"/\*\*.*?\@license.*?\*/", re.DOTALL | re.MULTILINE)
IMPORT_NAMESPACE_REGEX = re.compile(
    r"^\s*import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['\"](\.\.?/[^\'\"]+)['\"];?",
    re.MULTILINE,
)
IMPORT_RELATIVE_OTHER_PATTERN = re.compile(
    r'^\s*import\s+(?:(?:\{[^}]+\}|\w+|)\s+from\s+)?[\'"](\.\.?/[^\'"]+)[\'"];?\s*$',
    re.MULTILINE,
)
IMPORT_RELATIVE_SIDE_EFFECT_PATTERN = re.compile(
    r'^\s*import\s+[\'"](\.\.?/[^\'"]+)[\'"];?\s*$', re.MULTILINE
)
REMOVE_NON_RELATIVE_SIDE_EFFECT = re.compile(
    r"^\s*import\s+['\"]([^./][^'\"]*?)['\"];?\s*", re.MULTILINE
)
EXPORT_FROM_PATTERN = re.compile(
    r'^\s*export\s+(?:{[^}]+?}|\*)\s+from\s+[\'"](\.\.?/[^\'"]+)[\'"];?\s*',
    re.MULTILINE,
)
EXPORT_LIST_PATTERN = re.compile(r"^\s*export\s+{\s*[^}\s]+?\s*};?\s*", re.MULTILINE)
EXPORT_DECL_PATTERN = re.compile(
    r"^(\s*)export\s+(?!default)(\bdeclare\b\s+)?(\basync\b\s+)?(class|function|const|let|var|enum|interface|type)(\s+|;|$)",
    re.MULTILINE,
)
EXPORT_DEFAULT_PATTERN = re.compile(r"^(\s*)export\s+default\s+", re.MULTILINE)
EXPORT_NAMED_CAPTURE_REGEX = re.compile(
    r"^\s*export\s+(?:declare\s+)?(?:async\s+)?(class|function|const|let|var|enum)\s+([a-zA-Z0-9_]+)",
    re.MULTILINE,
)
EXPORT_DEFAULT_CAPTURE_REGEX = re.compile(
    r"^\s*export\s+default\s+(?:(?:class|function)\s+([a-zA-Z0-9_]+)|(?:const|let|var)\s+([a-zA-Z0-9_]+))",
    re.MULTILINE,
)
EXPORT_NAMED_LIST_CAPTURE_REGEX = re.compile(
    r"^\s*export\s*{\s*([^}]+?)\s*};?", re.MULTILINE
)
EXPORT_LIST_ITEM_REGEX = re.compile(r"\b([a-zA-Z0-9_]+)(?:\s+as\s+([a-zA-Z0-9_]+))?\b")
REMOVE_ADD_MATCHERS_CALL = re.compile(
    r"^\s*jasmine\.addMatchers\s*\([\s\S]*?\);?\s*$", re.MULTILINE
)  # More robust for multi-line args


# --- Step 1 & 2: Process Files (Unchanged logic) ---
def process_and_collect(
    files: List[str],
    base_directory: str,
    exports_map: Dict[str, Set[str]],
    namespace_imports_map: Dict[str, Dict[str, str]],
) -> List[str]:
    code_chunks = []
    processed_count = 0
    print(f"\nProcessing {len(files)} files...")
    for file_path in files:
        relative_path = os.path.relpath(file_path, base_directory)
        abs_file_path = os.path.abspath(file_path)
        try:
            with open(file_path, "r", encoding="utf-8") as infile:
                original_content = infile.read()
            content = original_content
            current_exports = set()
            current_ns_imports = {}
            content = LICENSE_BLOCK_PATTERN.sub("", content)
            ns_imports = IMPORT_NAMESPACE_REGEX.findall(content)
            content = IMPORT_NAMESPACE_REGEX.sub("", content)
            for alias, rel_path in ns_imports:
                target = resolve_relative_path(abs_file_path, rel_path)
                if target:
                    current_ns_imports[alias] = target
            if current_ns_imports:
                namespace_imports_map[abs_file_path] = current_ns_imports
            content = IMPORT_RELATIVE_OTHER_PATTERN.sub("", content)
            content = IMPORT_RELATIVE_SIDE_EFFECT_PATTERN.sub("", content)
            content = REMOVE_NON_RELATIVE_SIDE_EFFECT.sub("", content)
            content = REMOVE_ADD_MATCHERS_CALL.sub("", content)
            # Capture exports from original
            for _, name in EXPORT_NAMED_CAPTURE_REGEX.findall(original_content):
                current_exports.add(name)
            for m in EXPORT_DEFAULT_CAPTURE_REGEX.finditer(original_content):
                name = m.group(1) or m.group(2)
                current_exports.add(name)
            for m in EXPORT_NAMED_LIST_CAPTURE_REGEX.finditer(original_content):
                for item_m in EXPORT_LIST_ITEM_REGEX.finditer(m.group(1)):
                    current_exports.add(item_m.group(2) or item_m.group(1))
            # Remove export keywords from processed
            content = EXPORT_DECL_PATTERN.sub(r"\1\2\3\4\5", content)
            content = EXPORT_DEFAULT_PATTERN.sub(r"\1/* export default */ ", content)
            content = EXPORT_FROM_PATTERN.sub("", content)
            content = EXPORT_LIST_PATTERN.sub("", content)
            if current_exports:
                exports_map[abs_file_path].update(current_exports)
            trimmed = content.strip()
            if trimmed:
                code_chunks.append(
                    create_section_header(relative_path)
                    + trimmed
                    + create_section_footer(relative_path)
                )
                processed_count += 1
        except Exception as e:
            print(f"  [Error] Processing '{relative_path}': {e}", file=sys.stderr)
    print(
        f"Finished processing {len(files)} files. Added content from {processed_count} files."
    )
    return code_chunks


# --- Step 3: Analyze Aliases (Unchanged logic) ---
def analyze_imports_and_plan(
    namespace_imports_map: Dict[str, Dict[str, str]],
) -> Tuple[Dict[str, str], Dict[str, str]]:
    print("\nAnalyzing namespace imports...")
    target_to_aliases = defaultdict(set)
    for src, imports in namespace_imports_map.items():
        for alias, target in imports.items():
            target_to_aliases[target].add(alias)
    alias_redirects = {}
    canonical_to_target = {}
    unified_count = 0
    print("  Assigning canonical aliases...")
    for target, aliases in target_to_aliases.items():
        if not aliases:
            continue
        canonical = min(aliases, key=lambda x: (len(x), x))
        canonical_to_target[canonical] = target
        for alias in aliases:
            if alias != canonical:
                if alias in alias_redirects and alias_redirects[alias] != canonical:
                    print(f"  [Warn] Alias conflict for '{alias}'", file=sys.stderr)
                elif alias not in alias_redirects:
                    alias_redirects[alias] = canonical
                    unified_count += 1
            elif alias not in alias_redirects:
                alias_redirects[alias] = canonical  # Map canonical to itself
    print(
        f"Alias analysis complete. Found {len(canonical_to_target)} unique namespace targets."
    )
    if unified_count > 0:
        print(f"  Unified {unified_count} non-canonical aliases.")
    return alias_redirects, canonical_to_target


# --- Step 4 & 5: Final Assembly and Write (Unchanged logic, verify comments) ---
def assemble_and_write(
    output_abs_path: str,
    code_chunks: List[str],
    exports_map: Dict[str, Set[str]],
    canonical_alias_to_target_path: Dict[str, str],
    alias_redirects: Dict[str, str],
    is_test_file: bool,
):
    print(f"\nAssembling {os.path.basename(output_abs_path)}...")
    output_parts = [LICENSE_TEXT, "\n\n"]
    prefix_declarations = []
    prefix_imports = []
    all_canonical_aliases = sorted(list(canonical_alias_to_target_path.keys()))

    if all_canonical_aliases:
        if is_test_file:
            print(
                f"  Generating import for {len(all_canonical_aliases)} alias objects from main bundle..."
            )
            main_js_name = f"{MAIN_OUTPUT_BASENAME}.js"
            import_path = f"./{main_js_name}"
            aliases_str = ", ".join(all_canonical_aliases)
            import_stmt = f"import {{ {aliases_str} }} from '{import_path}';"
            prefix_imports.append("// --- Imports from Main Bundle ---")
            prefix_imports.append(
                "// These imports bring the alias objects (like 'math', 'utils') into scope."
            )
            prefix_imports.append(
                "// Original test code using `math.someFunction()` will now work correctly."
            )
            prefix_imports.append(import_stmt)
            prefix_imports.append("// --- End Imports ---\n")
            print(f"    Import statement: {import_stmt}")
        else:  # Main file
            print(
                f"  Generating exported const objects for {len(all_canonical_aliases)} aliases..."
            )
            prefix_declarations.append("// --- Exported Namespace Alias Objects ---")
            for alias in all_canonical_aliases:
                target_path = canonical_alias_to_target_path[alias]
                symbols = sorted(list(exports_map.get(target_path, set())))
                if symbols:
                    members_str = ", ".join(symbols)
                    const_decl = f"export const {alias} = {{ {members_str} }};"
                    prefix_declarations.append(const_decl)
                else:
                    print(
                        f"    [Warn] No exports found for alias '{alias}'. Skipping const export."
                    )
            prefix_declarations.append(
                "// --- End Exported Namespace Alias Objects ---\n"
            )

    # Assemble File Content
    if is_test_file:
        output_parts.extend(part + "\n" for part in prefix_imports)  # Imports first
        output_parts.append(TEST_HARNESS_CODE)  # Then harness
        output_parts.append("\n\n")
        output_parts.extend(code_chunks)  # Then test code
        output_parts.append(
            "\n\n// --- Autorun Tests ---\nrunAllTestsAndReport();\n"
        )  # Finally runner
    else:  # Main file
        output_parts.extend(
            part + "\n" for part in prefix_declarations
        )  # Exported consts first
        output_parts.extend(code_chunks)  # Then main code

    final_content = "".join(output_parts)

    # Apply Alias Rewrites
    if alias_redirects:
        print(
            f"  Applying final alias rewrites ({len(alias_redirects)} potential rules)..."
        )
        rewrites_applied = 0
        for old_alias, canonical_alias in alias_redirects.items():
            if old_alias == canonical_alias:
                continue
            pattern = r"\b" + re.escape(old_alias) + r"\."
            new_content = re.sub(pattern, f"{canonical_alias}.", final_content)
            if new_content != final_content:
                rewrites_applied += 1
                final_content = new_content
        if rewrites_applied > 0:
            print(f"  Applied rewrites for {rewrites_applied} different aliases.")
        else:
            print("  No alias rewrites were necessary.")

    # Write to File
    try:
        os.makedirs(os.path.dirname(output_abs_path), exist_ok=True)
        with open(output_abs_path, "w", encoding="utf-8") as f:
            f.write(final_content)
        print(f"Successfully wrote {output_abs_path}")
    except IOError as e:
        print(f"[Error] Failed writing '{output_abs_path}': {e}", file=sys.stderr)
        sys.exit(1)


# --- Main Execution (Unchanged) ---
def main():
    parser = argparse.ArgumentParser(
        description=f"Bundles TS files into '{OUTPUT_DIR}/{MAIN_OUTPUT_BASENAME}.ts' (exports alias objects) "
        f"and '{OUTPUT_DIR}/{TEST_OUTPUT_BASENAME}.ts' (imports alias objects), replacing Jasmine.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "input_directory", help="Root directory containing .ts source files."
    )
    args = parser.parse_args()
    start_time = time.time()
    if not os.path.isdir(args.input_directory):
        print(
            f"[Error] Input directory not found: {args.input_directory}",
            file=sys.stderr,
        )
        sys.exit(1)
    abs_input_dir = os.path.abspath(args.input_directory)
    main_files, test_files = find_ts_files(abs_input_dir)
    if not main_files and not test_files:
        print("No .ts files found. Exiting.")
        sys.exit(0)
    exports_map = defaultdict(set)
    namespace_imports_map = {}
    main_chunks = (
        process_and_collect(
            main_files, abs_input_dir, exports_map, namespace_imports_map
        )
        if main_files
        else []
    )
    test_chunks = (
        process_and_collect(
            test_files, abs_input_dir, exports_map, namespace_imports_map
        )
        if test_files
        else []
    )
    alias_redirects, canonical_to_target = analyze_imports_and_plan(
        namespace_imports_map
    )
    output_dir = os.path.abspath(OUTPUT_DIR)
    main_out = os.path.join(output_dir, f"{MAIN_OUTPUT_BASENAME}.ts")
    test_out = os.path.join(output_dir, f"{TEST_OUTPUT_BASENAME}.ts")
    if main_files:
        assemble_and_write(
            main_out,
            main_chunks,
            exports_map,
            canonical_to_target,
            alias_redirects,
            False,
        )
    else:
        print("\nSkipping main file write (no main source files).")
    if test_files:
        assemble_and_write(
            test_out,
            test_chunks,
            exports_map,
            canonical_to_target,
            alias_redirects,
            True,
        )
    else:
        print("\nSkipping test file write (no test source files).")
    print(f"\nProcess complete in {time.time() - start_time:.2f} seconds.")
    print(f"Output files generated in: '{output_dir}'")
    print(f"  - Main bundle: {os.path.basename(main_out)}")
    print(f"  - Test bundle: {os.path.basename(test_out)}")
    print(
        "\nNOTE: Compile output .ts files (e.g., `tsc`) before running the test bundle."
    )


if __name__ == "__main__":
    main()
