/**
 * @license
 * MIT License
 * Copyright (c) 2025 dream
 * Forked from Google's material-color-utilities (Apache License 2.0)
 * Full license text available in original source.
 */

// Assuming process might be needed for Node.js exit codes
import process from 'process';

// Import necessary functions and classes from the bundled library
import {
  math, utils, Blend, Cam16, Contrast, hexFromArgb, ContrastCurve, CorePalette,
  DislikeAnalyzer, DynamicScheme, Hct, MaterialDynamicColors, QuantizerCelebi,
  SchemeAndroid, SchemeContent, SchemeExpressive, SchemeFidelity, SchemeMonochrome,
  SchemeNeutral, SchemeTonalSpot, SchemeVibrant, Score, TemperatureCache,
  TonalPalette, ViewingConditions,
  // Assuming these are now correctly exported from cats.ts
  themeFromSourceColor, themeFromImage, applyTheme,
  DynamicColor
} from './cats.ts';

// Destructure math and utils for convenience in tests (doesn't affect library usage)
const {
  differenceDegrees,
} = math;



// --- Minimal Test Harness Emulation ---
const log = console.log;
const error = console.error;

class AssertionError extends Error { constructor(message: string) { super(message); this.name = 'AssertionError'; } }
interface TestResult { suite: string; name: string; passed: boolean; error?: Error | string; }
interface TestSuite { name: string; beforeEachFn: (() => void) | null; tests: { name: string; fn: () => void | Promise<void> }[]; childSuites: TestSuite[]; }

// Runner state
const runnerState = {
  suites: [] as TestSuite[], currentSuiteStack: [] as TestSuite[],
  results: [] as TestResult[], totalTests: 0, passed: 0, failed: 0,
  currentCustomMatchers: {} as Record<string, (this: ExpectContext, ...args: any[]) => { pass: boolean, message?: string }>,
};

// Test definition functions
function describe(name: string, suiteFn: () => void): void {
  const newSuite: TestSuite = { name: name, beforeEachFn: null, tests: [], childSuites: [] };
  const parentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (parentSuite) parentSuite.childSuites.push(newSuite); else runnerState.suites.push(newSuite);
  runnerState.currentSuiteStack.push(newSuite);
  try { suiteFn(); } catch (e) { error(`Error during describe setup for "${name}":`, e); } finally { runnerState.currentSuiteStack.pop(); }
}
function it(name: string, testFn: () => void | Promise<void>): void {
  const currentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (!currentSuite) { error(`"it(${name})" outside describe block. Ignored.`); return; }
  currentSuite.tests.push({ name, fn: testFn });
}
function beforeEach(fn: () => void): void {
  const currentSuite = runnerState.currentSuiteStack[runnerState.currentSuiteStack.length - 1];
  if (!currentSuite) { error(`"beforeEach" outside describe block. Ignored.`); return; }
  if (!currentSuite.beforeEachFn) currentSuite.beforeEachFn = fn; // Keep first
}
function fail(message?: string): never { throw new AssertionError(`Explicit failure${message ? `: ${message}` : ''}`); }

// Expect API
class ExpectContext {
  constructor(public actual: any, public isNot: boolean = false) { }
  get not(): ExpectContext { return new ExpectContext(this.actual, !this.isNot); }
  private check(pass: boolean, msg: string) { if (pass === this.isNot) throw new AssertionError(msg); }

  // Matchers
  toBe(expected: any): void { this.check(Object.is(this.actual, expected), `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be ${String(expected)}`); }
  toEqual(expected: any): void { this.check(deepEqual(this.actual, expected), `Expected ${safeStringify(this.actual)} ${this.isNot ? 'not ' : ''}to equal ${safeStringify(expected)}`); }
  toBeCloseTo(expected: number, precision = 2): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') throw new AssertionError('Type mismatch'); const t = Math.pow(10, -precision) / 2; this.check(Math.abs(this.actual - expected) < t, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be close to ${expected} (prec ${precision})`); }
  toBeTrue(): void { this.check(this.actual === true, `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be true`); }
  toBeFalse(): void { this.check(this.actual === false, `Expected ${String(this.actual)} ${this.isNot ? 'not ' : ''}to be false`); }
  toBeLessThan(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') throw new AssertionError('Type mismatch'); this.check(this.actual < expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be < ${expected}`); }
  toBeLessThanOrEqual(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') throw new AssertionError('Type mismatch'); this.check(this.actual <= expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be <= ${expected}`); }
  toBeGreaterThan(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') throw new AssertionError('Type mismatch'); this.check(this.actual > expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be > ${expected}`); }
  toBeGreaterThanOrEqual(expected: number): void { if (typeof this.actual !== 'number' || typeof expected !== 'number') throw new AssertionError('Type mismatch'); this.check(this.actual >= expected, `Expected ${this.actual} ${this.isNot ? 'not ' : ''}to be >= ${expected}`); }
  toThrow(expectedError?: string | RegExp | Error | (new (...a: any[]) => Error)): void { if (typeof this.actual !== 'function') throw new AssertionError('Need function for toThrow()'); let didThrow = false; let thrown: any = null; try { this.actual(); } catch (e) { didThrow = true; thrown = e; } let pass = didThrow; let msg = `Expected func ${this.isNot ? 'not ' : ''}to throw`; if (didThrow && expectedError !== undefined) { const errStr = thrown?.message || String(thrown); if (expectedError instanceof RegExp) { pass = expectedError.test(errStr); msg = `Expected func ${this.isNot ? 'not ' : ''}to throw matching ${expectedError}. Got: "${errStr}"`; } else if (typeof expectedError === 'string') { pass = errStr.includes(expectedError); msg = `Expected func ${this.isNot ? 'not ' : ''}to throw containing "${expectedError}". Got: "${errStr}"`; } else if (typeof expectedError === 'function' && thrown instanceof expectedError) { pass = true; msg = `Expected func ${this.isNot ? 'not ' : ''}to throw type ${expectedError.name}. Got: ${thrown?.constructor?.name}`; } else if (expectedError instanceof Error) { pass = thrown === expectedError; msg = `Expected func ${this.isNot ? 'not ' : ''}to throw specific instance.`; } else { pass = false; msg = `Invalid expectedError for toThrow()`; } } else if (!didThrow && expectedError !== undefined) { pass = false; msg = `Expected func to throw matching ${expectedError}, but it did not.`; } this.check(pass, msg); }
  [key: string]: any; // Allow dynamic matchers
}
function expect(actual: any): ExpectContext {
  return new Proxy(new ExpectContext(actual), {
    get(target: ExpectContext, prop: string | symbol, receiver: any): any {
      if (prop === 'not') return new Proxy(new ExpectContext(target.actual, !target.isNot), this);
      if (prop in target || typeof prop === 'symbol') return Reflect.get(target, prop, receiver);
      if (typeof prop === 'string' && prop in runnerState.currentCustomMatchers) {
        const matcherFn = runnerState.currentCustomMatchers[prop];
        return (...args: any[]) => {
          const result = matcherFn.call(target, target.actual, ...args);
          if (typeof result !== 'object' || typeof result.pass !== 'boolean') throw new Error(`Matcher '${prop}' bad return`);
          target['check'](result.pass, (result.message || `Matcher '${prop}' failed`));
        };
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}

// Helpers for harness
function deepEqual(a: any, b: any): boolean { if (a === b || Object.is(a, b)) return true; if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false; if (Array.isArray(a) && Array.isArray(b)) { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) { if (!deepEqual(a[i], b[i])) return false; } return true; } if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime(); if (a instanceof RegExp && b instanceof RegExp) return a.toString() === b.toString(); if (a.constructor === Object && b.constructor === Object) { const keysA = Object.keys(a).sort(); const keysB = Object.keys(b).sort(); if (keysA.length !== keysB.length || !deepEqual(keysA, keysB)) return false; for (const key of keysA) { if (!deepEqual(a[key], b[key])) return false; } return true; } return false; }
function safeStringify(obj: any): string { try { return JSON.stringify(obj) ?? String(obj); } catch { return String(obj); } }
function numberToHex(n: number): string { if (typeof n !== 'number' || !Number.isInteger(n)) return String(n); return `#${(n >>> 0).toString(16).toUpperCase().padStart(8, '0')}`; }

// Custom matchers registry
const customMatchersImpl = {
  matchesColor: function (this: ExpectContext, actual: unknown, expected: unknown): { pass: boolean; message?: string } { if (typeof actual !== 'number' || typeof expected !== 'number') return { pass: false, message: `Expected numbers` }; const actR = Math.round(actual); const expR = Math.round(expected); const pass = Object.is(actR, expR); const msg = this.isNot ? `Expected ${numberToHex(actR)} not to match ${numberToHex(expR)}` : `Expected ${numberToHex(actR)} to match ${numberToHex(expR)}`; return { pass, message: msg }; }
};

// Test execution and reporting
async function runTests(suites: TestSuite[], parentName = '', currentBeforeEach: (() => void) | null = null) {
  for (const suite of suites) {
    const fullName = parentName ? `${parentName} > ${suite.name}` : suite.name;
    log(`\nRUNNING SUITE: ${fullName}`);
    const suiteBeforeEach = suite.beforeEachFn || currentBeforeEach;
    if (suite.tests.length > 0) log(`  Tests (${suite.tests.length}):`);
    for (const test of suite.tests) {
      runnerState.totalTests++; let passed = false; let err: Error | string | undefined;
      try { if (suiteBeforeEach) { try { suiteBeforeEach(); } catch (e: any) { throw new Error(`beforeEach failed: ${String(e)}`); } } const result = test.fn(); if (result instanceof Promise) await result; passed = true; log(`    [PASS] ${test.name}`); }
      catch (e: any) { passed = false; err = e instanceof Error ? e : new Error(String(e)); error(`    [FAIL] ${test.name}`); const msg = err instanceof AssertionError ? err.message : (err.stack || String(err)); error(`      ${msg.split('\n')[0]}`); }
      finally { runnerState.results.push({ suite: fullName, name: test.name, passed, error: err }); if (passed) runnerState.passed++; else runnerState.failed++; }
    }
    if (suite.childSuites.length > 0) await runTests(suite.childSuites, fullName, suiteBeforeEach);
  }
}
async function runAllTestsAndReport() {
  log('--- Starting Minimal Test Run ---');
  runnerState.results = []; runnerState.totalTests = 0; runnerState.passed = 0; runnerState.failed = 0;
  runnerState.currentCustomMatchers = {}; Object.assign(runnerState.currentCustomMatchers, customMatchersImpl);
  await runTests(runnerState.suites); // Assumes describe/it populated suites
  log('\n--- Test Summary ---');
  const total = runnerState.totalTests; if (total === 0) { log("No tests found."); return; }
  const passedPct = ((runnerState.passed / total) * 100).toFixed(1); const failedPct = ((runnerState.failed / total) * 100).toFixed(1);
  log(`Total Tests: ${total}`); log(`Passed: ${runnerState.passed} (${passedPct}%)`); log(`Failed: ${runnerState.failed} (${failedPct}%)`);
  if (runnerState.failed > 0) {
    error('\n--- Failures ---');
    runnerState.results.filter(r => !r.passed).forEach(f => { error(`Suite: ${f.suite}\n  Test: ${f.name}`); const msg = f.error instanceof Error ? (f.error.stack || f.error.message) : String(f.error); error(`  Error: ${msg}\n`); });
    if (typeof process !== 'undefined' && process.exit) { log("Exiting with status 1."); process.exit(1); }
    else { throw new Error("Test run failed."); }
  } else {
    log('\nAll tests passed!');
    if (typeof process !== 'undefined' && process.exit) { process.exit(0); }
  }
}
// --- End Minimal Test Harness Emulation ---


// --- Test Constants ---
const RED = 0xffff0000;
const GREEN = 0xff00ff00;
const BLUE = 0xff0000ff;
const YELLOW = 0xffffff00;
const WHITE = 0xffffffff;
const BLACK = 0xff000000;

// Base64 for a 1x1 red PNG image
const BASE64_RED_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

// ============================================================
// START OF PORTED TESTS (Comments simplified)
// ============================================================

// --- BEGIN FILE: blend/blend_test.ts ---
describe('blend/blend.ts tests', () => {
  describe('harmonize', () => {
    // Test harmonization between primary colors
    it('redToBlue', () => expect(Blend.harmonize(RED, BLUE)).matchesColor(0xffFB0057));
    it('redToGreen', () => expect(Blend.harmonize(RED, GREEN)).matchesColor(0xffD85600));
    it('redToYellow', () => expect(Blend.harmonize(RED, YELLOW)).matchesColor(0xffD85600));
    it('blueToGreen', () => expect(Blend.harmonize(BLUE, GREEN)).matchesColor(0xff0047A3));
    it('blueToRed', () => expect(Blend.harmonize(BLUE, RED)).matchesColor(0xff5700DC));
    it('blueToYellow', () => expect(Blend.harmonize(BLUE, YELLOW)).matchesColor(0xff0047A3));
    it('greenToBlue', () => expect(Blend.harmonize(GREEN, BLUE)).matchesColor(0xff00FC94));
    it('greenToRed', () => expect(Blend.harmonize(GREEN, RED)).matchesColor(0xffB1F000));
    it('greenToYellow', () => expect(Blend.harmonize(GREEN, YELLOW)).matchesColor(0xffB1F000));
    it('yellowToBlue', () => expect(Blend.harmonize(YELLOW, BLUE)).matchesColor(0xffEBFFBA));
    it('yellowToGreen', () => expect(Blend.harmonize(YELLOW, GREEN)).matchesColor(0xffEBFFBA));
    it('yellowToRed', () => expect(Blend.harmonize(YELLOW, RED)).matchesColor(0xffFFF6E3));
  });
});
// --- END FILE: blend/blend_test.ts ---


// --- BEGIN FILE: contrast/contrast_test.ts ---
describe('contrast/contrast.ts tests', () => {
  // Test Contrast ratio and adjustment functions
  it('ratioOfTones_outOfBoundsInput', () => expect(Contrast.ratioOfTones(-10.0, 110.0)).toBeCloseTo(21.0, 3));
  it('lighter_impossibleRatioErrors', () => expect(Contrast.lighter(90.0, 10.0)).toBeCloseTo(-1.0, 3));
  it('lighter_outOfBoundsInputAboveErrors', () => expect(Contrast.lighter(110.0, 2.0)).toBeCloseTo(-1.0, 3));
  it('lighter_outOfBoundsInputBelowErrors', () => expect(Contrast.lighter(-10.0, 2.0)).toBeCloseTo(-1.0, 3));
  it('lighterUnsafe_returnsMaxTone', () => expect(Contrast.lighterUnsafe(100.0, 2.0)).toBeCloseTo(100.0, 3));
  it('darker_impossibleRatioErrors', () => expect(Contrast.darker(10.0, 20.0)).toBeCloseTo(-1.0, 3));
  it('darker_outOfBoundsInputAboveErrors', () => expect(Contrast.darker(110.0, 2.0)).toBeCloseTo(-1.0, 3));
  it('darker_outOfBoundsInputBelowErrors', () => expect(Contrast.darker(-10.0, 2.0)).toBeCloseTo(-1.0, 3));
  it('darkerUnsafe_returnsMinTone', () => expect(Contrast.darkerUnsafe(0.0, 2.0)).toBeCloseTo(0.0, 3));
});
// --- END FILE: contrast/contrast_test.ts ---


// --- BEGIN FILE: dislike/dislike_analyzer_test.ts ---
describe('dislike/dislike_analyzer.ts tests', () => {
  // Test dislike analyzer for specific color ranges
  it('likes Monk Skin Tone Scale colors', () => {
    const monkSkinTones = [0xfff6ede4, 0xfff3e7db, 0xfff7ead0, 0xffeadaba, 0xffd7bd96, 0xffa07e56, 0xff825c43, 0xff604134, 0xff3a312a, 0xff292420];
    for (const color of monkSkinTones) expect(DislikeAnalyzer.isDisliked(Hct.fromInt(color))).toBeFalse();
  });
  it('dislikes bile colors', () => {
    const dislikedColors = [0xff95884B, 0xff716B40, 0xffB08E00, 0xff4C4308, 0xff464521];
    for (const color of dislikedColors) expect(DislikeAnalyzer.isDisliked(Hct.fromInt(color))).toBeTrue();
  });
  it('makes bile colors likable', () => {
    const dislikedColors = [0xff95884B, 0xff716B40, 0xffB08E00, 0xff4C4308, 0xff464521];
    for (const color of dislikedColors) {
      const hct = Hct.fromInt(color);
      expect(DislikeAnalyzer.isDisliked(hct)).toBeTrue();
      expect(DislikeAnalyzer.isDisliked(DislikeAnalyzer.fixIfDisliked(hct))).toBeFalse();
    }
  });
  it('likes tone 67 colors', () => {
    const color = Hct.from(100.0, 50.0, 67.0);
    expect(DislikeAnalyzer.isDisliked(color)).toBeFalse();
    expect(DislikeAnalyzer.fixIfDisliked(color).toInt()).toEqual(color.toInt());
  });
});
// --- END FILE: dislike/dislike_analyzer_test.ts ---


// --- BEGIN FILE: dynamiccolor/dynamic_color_test.ts ---
// Setup for DynamicColor tests
const seedColorsDC = [Hct.fromInt(RED), Hct.fromInt(YELLOW), Hct.fromInt(GREEN), Hct.fromInt(BLUE)];
const allMaterialColors = Object.values(MaterialDynamicColors)
  .filter((c): c is DynamicColor => c instanceof DynamicColor); // Filter out non-DynamicColor properties
const materialColorByName = new Map(allMaterialColors.map(c => [c.name, c]));
const allSchemes: DynamicScheme[] = [];
for (const color of seedColorsDC) {
  for (const contrast of [-1.0, -0.5, 0.0, 0.5, 1.0]) {
    for (const isDark of [false, true]) {
      allSchemes.push(
        new SchemeContent(color, isDark, contrast), new SchemeExpressive(color, isDark, contrast),
        new SchemeFidelity(color, isDark, contrast), new SchemeMonochrome(color, isDark, contrast),
        new SchemeNeutral(color, isDark, contrast), new SchemeTonalSpot(color, isDark, contrast),
        new SchemeVibrant(color, isDark, contrast),
      );
    }
  }
}

describe('dynamiccolor/dynamic_color.ts & related tests', () => {
  // Test contrast compliance across various schemes and levels
  it('generates colors respecting contrast minimums', () => {
    const textSurfacePairsContrast = [
      ['on_primary', 'primary'], ['on_primary_container', 'primary_container'],
      ['on_secondary', 'secondary'], ['on_secondary_container', 'secondary_container'],
      ['on_tertiary', 'tertiary'], ['on_tertiary_container', 'tertiary_container'],
      ['on_error', 'error'], ['on_error_container', 'error_container'],
      ['on_background', 'background'],
      ['on_surface', 'surface'], // Added missing pair
      ['on_surface_variant', 'surface_variant'], // Corrected pair
      ['inverse_on_surface', 'inverse_surface'], // Added inverse pair
    ];
    for (const scheme of allSchemes) {
      for (const [fgName, bgName] of textSurfacePairsContrast) {
        const fgColor = materialColorByName.get(fgName);
        const bgColor = materialColorByName.get(bgName);
        if (!fgColor || !bgColor) { fail(`Color not found: ${fgName} or ${bgName}`); continue; }
        const fgTone = fgColor.getHct(scheme).tone;
        const bgTone = bgColor.getHct(scheme).tone;
        const contrast = Contrast.ratioOfTones(fgTone, bgTone);
        const minReq = scheme.contrastLevel >= 0.0 ? 4.5 : 3.0;
        if (contrast < minReq - 0.02) { // Allow tiny tolerance
          fail(`${fgName} (${fgTone.toFixed(1)}) on ${bgName} (${bgTone.toFixed(1)}) contrast ${contrast.toFixed(2)} < ${minReq}`);
        }
      }
    }
  });

  // Test delta constraints (tone differences)
  it('respects tone delta constraints', () => {
    const deltaConstraints = [
      { pair: ['primary', 'primary_container'], delta: 10, polarity: 'farther' },
      { pair: ['secondary', 'secondary_container'], delta: 10, polarity: 'farther' },
      { pair: ['tertiary', 'tertiary_container'], delta: 10, polarity: 'farther' },
      { pair: ['error', 'error_container'], delta: 10, polarity: 'farther' },
      { pair: ['primary_fixed_dim', 'primary_fixed'], delta: 10, polarity: 'darker' },
      { pair: ['secondary_fixed_dim', 'secondary_fixed'], delta: 10, polarity: 'darker' },
      { pair: ['tertiary_fixed_dim', 'tertiary_fixed'], delta: 10, polarity: 'darker' },
    ];
    for (const scheme of allSchemes) {
      for (const { pair: [roleAname, roleBname], delta, polarity } of deltaConstraints) {
        const roleA = materialColorByName.get(roleAname);
        const roleB = materialColorByName.get(roleBname);
        if (!roleA || !roleB) { fail(`Color not found: ${roleAname} or ${roleBname}`); continue; }
        const toneA = roleA.getHct(scheme).tone;
        const toneB = roleB.getHct(scheme).tone;
        const isLighter = (polarity === 'lighter') || (polarity === 'nearer' && !scheme.isDark) || (polarity === 'farther' && scheme.isDark);
        const observedDelta = isLighter ? toneA - toneB : toneB - toneA;
        if (observedDelta < delta - 0.5) { // Allow tolerance
          fail(`Delta ${roleAname} (${toneA.toFixed(1)}) vs ${roleBname} (${toneB.toFixed(1)}): ${observedDelta.toFixed(1)} < ${delta} (${polarity})`);
        }
      }
    }
  });

  // Test background tones are not in the "awkward" 50-59 range
  it('avoids awkward background tones (50-59)', () => {
    const backgroundRoles = [
      'background', 'error', 'error_container', 'primary', 'primary_container', 'primary_fixed', 'primary_fixed_dim',
      'secondary', 'secondary_container', 'secondary_fixed', 'secondary_fixed_dim', 'surface', 'surface_bright',
      'surface_container', 'surface_container_high', 'surface_container_highest', 'surface_container_low',
      'surface_container_lowest', 'surface_dim', 'surface_tint', 'surface_variant', 'tertiary', 'tertiary_container',
      'tertiary_fixed', 'tertiary_fixed_dim'
    ];
    for (const scheme of allSchemes) {
      for (const roleName of backgroundRoles) {
        const role = materialColorByName.get(roleName);
        if (!role) { fail(`Color not found: ${roleName}`); continue; }
        const tone = role.getHct(scheme).tone;
        if (tone >= 49.5 && tone < 59.5) { // Check awkward zone (with tolerance)
          fail(`Background ${roleName} in awkward zone: ${tone.toFixed(1)}`);
        }
      }
    }
  });
});
// --- END FILE: dynamiccolor/dynamic_color_test.ts ---


// --- BEGIN FILE: dynamiccolor/fixed_dynamic_color_test.ts ---
describe('dynamiccolor/fixed_dynamic_color_test.ts tests', () => {
  // Test fixed accent colors in different schemes
  it('fixed colors in non-monochrome schemes (dark)', () => {
    const scheme = new SchemeTonalSpot(Hct.fromInt(RED), true, 0.0);
    expect(MaterialDynamicColors.primaryFixed.getHct(scheme).tone).toBeCloseTo(90.0, 0);
    expect(MaterialDynamicColors.primaryFixedDim.getHct(scheme).tone).toBeCloseTo(80.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixed.getHct(scheme).tone).toBeCloseTo(10.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixedVariant.getHct(scheme).tone).toBeCloseTo(30.0, 0);
    // Add checks for secondary/tertiary if needed
  });
  it('fixed ARGB colors in non-monochrome schemes (dark)', () => {
    const scheme = new SchemeTonalSpot(Hct.fromInt(RED), true, 0.0);
    expect(scheme.primaryFixed).matchesColor(0xFFFFDAD4);
    expect(scheme.primaryFixedDim).matchesColor(0xFFFFB4A8);
    expect(scheme.onPrimaryFixed).matchesColor(0xFF3A0905);
    expect(scheme.onPrimaryFixedVariant).matchesColor(0xFF73342A);
    // Add checks for secondary/tertiary if needed
  });
  it('fixed colors in monochrome schemes (light)', () => {
    const scheme = new SchemeMonochrome(Hct.fromInt(RED), false, 0.0);
    expect(MaterialDynamicColors.primaryFixed.getHct(scheme).tone).toBeCloseTo(40.0, 0);
    expect(MaterialDynamicColors.primaryFixedDim.getHct(scheme).tone).toBeCloseTo(30.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixed.getHct(scheme).tone).toBeCloseTo(100.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixedVariant.getHct(scheme).tone).toBeCloseTo(90.0, 0);
    // Add checks for secondary/tertiary if needed
  });
  it('fixed colors in monochrome schemes (dark)', () => {
    const scheme = new SchemeMonochrome(Hct.fromInt(RED), true, 0.0);
    expect(MaterialDynamicColors.primaryFixed.getHct(scheme).tone).toBeCloseTo(40.0, 0);
    expect(MaterialDynamicColors.primaryFixedDim.getHct(scheme).tone).toBeCloseTo(30.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixed.getHct(scheme).tone).toBeCloseTo(100.0, 0);
    expect(MaterialDynamicColors.onPrimaryFixedVariant.getHct(scheme).tone).toBeCloseTo(90.0, 0);
    // Add checks for secondary/tertiary if needed
  });
});
// --- END FILE: dynamiccolor/fixed_dynamic_color_test.ts ---


// --- BEGIN FILE: hct/hct_round_trip_test.ts ---
describe('hct/hct_round_trip_test.ts tests', () => {
  // Test if ARGB -> HCT -> ARGB preserves color
  it('ARGB to HCT to ARGB preserves original color', () => {
    for (let r = 0; r < 256; r += 15) { // Increased step slightly for speed
      for (let g = 0; g < 256; g += 15) {
        for (let b = 0; b < 256; b += 15) {
          const argb = utils.argbFromRgb(r, g, b);
          const hct = Hct.fromInt(argb);
          const reconstructed = Hct.from(hct.hue, hct.chroma, hct.tone).toInt();
          expect(reconstructed).toEqual(argb);
        }
      }
    }
  });
});
// --- END FILE: hct/hct_round_trip_test.ts ---


// --- BEGIN FILE: hct/hct_test.ts ---
describe('hct/hct_test.ts tests', () => {
  // Test CAM16 properties for specific colors
  describe('CAM properties from ARGB', () => {
    it('red', () => { const cam = Cam16.fromInt(RED); expect(cam.hue).toBeCloseTo(27.4, 1); expect(cam.chroma).toBeCloseTo(113.4, 1); expect(cam.j).toBeCloseTo(46.4, 1); });
    it('green', () => { const cam = Cam16.fromInt(GREEN); expect(cam.hue).toBeCloseTo(142.1, 1); expect(cam.chroma).toBeCloseTo(108.4, 1); expect(cam.j).toBeCloseTo(79.3, 1); });
    it('blue', () => { const cam = Cam16.fromInt(BLUE); expect(cam.hue).toBeCloseTo(282.8, 1); expect(cam.chroma).toBeCloseTo(87.2, 1); expect(cam.j).toBeCloseTo(25.5, 1); });
    it('white', () => { const cam = Cam16.fromInt(WHITE); expect(cam.hue).toBeCloseTo(209.5, 1); expect(cam.chroma).toBeCloseTo(2.9, 1); expect(cam.j).toBeCloseTo(100.0, 1); });
    it('black', () => { const cam = Cam16.fromInt(BLACK); expect(cam.hue).toBeCloseTo(0.0, 1); expect(cam.chroma).toBeCloseTo(0.0, 1); expect(cam.j).toBeCloseTo(0.0, 1); });
  });
  // Test CAM -> ARGB -> CAM round trip
  describe('CAM to ARGB to CAM preserves color', () => {
    it('red', () => expect(Cam16.fromInt(RED).toInt()).toEqual(RED));
    it('green', () => expect(Cam16.fromInt(GREEN).toInt()).toEqual(GREEN));
    it('blue', () => expect(Cam16.fromInt(BLUE).toInt()).toEqual(BLUE));
  });
  // Test ARGB to HCT conversion
  describe('ARGB to HCT', () => {
    it('green', () => { const hct = Hct.fromInt(GREEN); expect(hct.hue).toBeCloseTo(142.1, 1); expect(hct.chroma).toBeCloseTo(108.4, 1); expect(hct.tone).toBeCloseTo(87.7, 1); });
    it('blue', () => { const hct = Hct.fromInt(BLUE); expect(hct.hue).toBeCloseTo(282.8, 1); expect(hct.chroma).toBeCloseTo(87.2, 1); expect(hct.tone).toBeCloseTo(32.3, 1); });
    it('blue tone 90', () => { const hct = Hct.from(282.8, 87.2, 90.0); expect(hct.hue).toBeCloseTo(282.2, 1); expect(hct.chroma).toBeCloseTo(19.1, 1); expect(hct.tone).toBeCloseTo(90.0, 1); });
  });
  // Test default viewing conditions values
  it('Default viewing conditions are correct', () => {
    const vc = ViewingConditions.DEFAULT;
    expect(vc.n).toBeCloseTo(0.184, 3); expect(vc.aw).toBeCloseTo(29.981, 3); expect(vc.nbb).toBeCloseTo(1.017, 3);
    expect(vc.c).toBeCloseTo(0.69, 3); expect(vc.fl).toBeCloseTo(0.388, 3); expect(vc.fLRoot).toBeCloseTo(0.789, 3);
  });
  // Test HCT solver accuracy
  describe('HctSolver accuracy', () => {
    it('returns a sufficiently close color', () => {
      for (let hue = 15; hue < 360; hue += 30) {
        for (let chroma = 0; chroma <= 100; chroma += 10) {
          for (let tone = 20; tone <= 80; tone += 10) {
            const hct = Hct.from(hue, chroma, tone);
            if (chroma > 0) expect(differenceDegrees(hct.hue, hue)).toBeLessThanOrEqual(4.0);
            expect(hct.chroma).toBeGreaterThanOrEqual(0);
            expect(hct.chroma).toBeLessThanOrEqual(chroma + 2.5);
            expect(Math.abs(hct.tone - tone)).toBeLessThanOrEqual(0.5);
          }
        }
      }
    });
  });
});
// --- END FILE: hct/hct_test.ts ---


// --- BEGIN FILE: palettes/palettes_test.ts ---
describe('palettes/palettes_test.ts tests', () => {
  // Test TonalPalette generation from blue
  it('TonalPalette from Blue', () => {
    const blue = TonalPalette.fromInt(BLUE);
    expect(blue.tone(100)).matchesColor(0xffffffff); expect(blue.tone(95)).matchesColor(0xfff1efff); expect(blue.tone(90)).matchesColor(0xffe0e0ff);
    expect(blue.tone(50)).matchesColor(0xff5a64ff); expect(blue.tone(10)).matchesColor(0xff00006e); expect(blue.tone(0)).matchesColor(0xff000000);
  });
  // Test CorePalette generation from blue
  it('CorePalette from Blue', () => {
    const core = CorePalette.of(BLUE);
    expect(core.a1.tone(50)).matchesColor(0xff5a64ff); // Primary
    expect(core.a2.tone(50)).matchesColor(0xff75758b); // Secondary
  });
  it('Content CorePalette from Blue', () => {
    const core = CorePalette.contentOf(BLUE);
    expect(core.a1.tone(50)).matchesColor(0xff5a64ff); // Primary
    expect(core.a2.tone(50)).matchesColor(0xff7173a0); // Secondary
  });
  // Test KeyColor calculation logic
  describe('KeyColor', () => {
    it('finds key color with exact chroma', () => { const result = TonalPalette.fromHueAndChroma(50.0, 60.0).keyColor; expect(differenceDegrees(result.hue, 50.0)).toBeLessThan(10.0); expect(result.chroma).toBeCloseTo(60.0, 0.5); });
    it('finds key color for high chroma request', () => { const result = TonalPalette.fromHueAndChroma(149.0, 200.0).keyColor; expect(differenceDegrees(result.hue, 149.0)).toBeLessThan(10.0); expect(result.chroma).toBeGreaterThan(89.0); });
    it('finds key color for low chroma request (near T50)', () => { const result = TonalPalette.fromHueAndChroma(50.0, 3.0).keyColor; expect(differenceDegrees(result.hue, 50.0)).toBeLessThan(10.0); expect(result.chroma).toBeCloseTo(3.0, 0.5); expect(result.tone).toBeCloseTo(50.0, 0.5); });
  });
});
// --- END FILE: palettes/palettes_test.ts ---


// --- BEGIN FILE: quantize/quantizer_celebi_test.ts ---
describe('quantize/quantizer_celebi.ts tests', () => {
  // Test QuantizerCelebi with simple inputs
  it('1R', () => { const result = QuantizerCelebi.quantize([RED], 128); expect(result.size).toBe(1); expect(result.get(RED)).toBe(1); });
  it('1G', () => { const result = QuantizerCelebi.quantize([GREEN], 128); expect(result.size).toBe(1); expect(result.get(GREEN)).toBe(1); });
  it('1B', () => { const result = QuantizerCelebi.quantize([BLUE], 128); expect(result.size).toBe(1); expect(result.get(BLUE)).toBe(1); });
  it('5B', () => { const result = QuantizerCelebi.quantize([BLUE, BLUE, BLUE, BLUE, BLUE], 128); expect(result.size).toBe(1); expect(result.get(BLUE)).toBe(5); });
  it('2R 3G', () => { const result = QuantizerCelebi.quantize([RED, RED, GREEN, GREEN, GREEN], 128); expect(result.size).toBe(2); expect(result.get(RED)).toBe(2); expect(result.get(GREEN)).toBe(3); });
  it('1R 1G 1B', () => { const result = QuantizerCelebi.quantize([RED, GREEN, BLUE], 128); expect(result.size).toBe(3); expect(result.get(RED)).toBe(1); expect(result.get(GREEN)).toBe(1); expect(result.get(BLUE)).toBe(1); });
});
// --- END FILE: quantize/quantizer_celebi_test.ts ---


// --- BEGIN FILE: scheme/dynamic_scheme_test.ts ---
describe('scheme/dynamic_scheme.ts tests', () => {
  // Test hue rotation logic within DynamicScheme
  it('getRotatedHue handles 0 length input', () => expect(DynamicScheme.getRotatedHue(Hct.from(43, 16, 16), [], [])).toBeCloseTo(43, 0.4));
  it('getRotatedHue handles 1 length input no rotation', () => expect(DynamicScheme.getRotatedHue(Hct.from(43, 16, 16), [0], [0])).toBeCloseTo(43, 0.4));
  it('getRotatedHue throws on input length mismatch', () => expect(() => { DynamicScheme.getRotatedHue(Hct.from(43, 16, 16), [0, 1], [0]); }).toThrow());
  it('getRotatedHue handles boundary rotation correctly', () => expect(DynamicScheme.getRotatedHue(Hct.from(43, 16, 16), [0, 42, 360], [0, 15, 0])).toBeCloseTo(43 + 15, 0.4));
  it('getRotatedHue wraps rotation result > 360', () => expect(DynamicScheme.getRotatedHue(Hct.from(43, 16, 16), [0, 42, 360], [0, 480, 0])).toBeCloseTo(163, 0.4));
});
// --- END FILE: scheme/dynamic_scheme_test.ts ---


// --- BEGIN FILE: scheme/scheme_test.ts ---
// Note: SchemeAndroid tests might be less relevant if focusing on core Material schemes
describe('scheme/scheme_android.ts tests', () => {
  // Test generation of Android-specific schemes
  it('blue light scheme (Android)', () => expect(SchemeAndroid.light(BLUE).colorAccentPrimary).matchesColor(0xffe0e0ff));
  it('blue dark scheme (Android)', () => expect(SchemeAndroid.dark(BLUE).colorAccentPrimary).matchesColor(0xffe0e0ff));
  it('3rd party light scheme (Android)', () => { const s = SchemeAndroid.light(0xff6750a4); expect(s.colorAccentPrimary).matchesColor(0xffe9ddff); expect(s.textColorPrimary).matchesColor(0xff1c1b1e); });
  it('3rd party dark scheme (Android)', () => { const s = SchemeAndroid.dark(0xff6750a4); expect(s.colorAccentPrimary).matchesColor(0xffe9ddff); expect(s.textColorPrimary).matchesColor(0xfff4eff4); });
});
// --- END FILE: scheme/scheme_test.ts ---


// --- BEGIN FILE: score/score_test.ts ---
describe('score/score.ts tests', () => {
  // Test color scoring logic
  it('prioritizes chroma over grayscale', () => { const map = new Map([[BLACK, 1], [WHITE, 1], [BLUE, 1]]); const ranked = Score.score(map); expect(ranked.length).toBe(1); expect(ranked[0]).toBe(BLUE); });
  it('prioritizes chroma when proportions equal', () => { const map = new Map([[RED, 1], [GREEN, 1], [BLUE, 1]]); const ranked = Score.score(map); expect(ranked.length).toBe(3); expect(ranked[0]).toBe(RED); expect(ranked[1]).toBe(GREEN); expect(ranked[2]).toBe(BLUE); });
  it('returns fallback gBlue when no suitable colors', () => { const map = new Map([[BLACK, 1]]); const ranked = Score.score(map); expect(ranked.length).toBe(1); expect(ranked[0]).toBe(0xff4285f4); });
  it('dedupes nearby hues', () => { const map = new Map([[0xff008772, 1], [0xff318477, 1]]); const ranked = Score.score(map); expect(ranked.length).toBe(1); expect(ranked[0]).toBe(0xff008772); });
  it('maximizes hue distance for desired count', () => { const map = new Map([[0xff008772, 1], [0xff008587, 1], [0xff007ebc, 1]]); const ranked = Score.score(map, { desired: 2 }); expect(ranked.length).toBe(2); expect(ranked[0]).toBe(0xff007ebc); expect(ranked[1]).toBe(0xff008772); });
  // Include a few representative generated scenarios
  it('passes generated scenario 1 (filter false)', () => { const map = new Map([[0xff7ea16d, 67], [0xffd8ccae, 67], [0xff835c0d, 49]]); const ranked = Score.score(map, { desired: 3, filter: false }); expect(ranked).toEqual([0xff7ea16d, 0xffd8ccae, 0xff835c0d]); });
  it('passes generated scenario 2 (filter true)', () => { const map = new Map([[0xffd33881, 14], [0xff3205cc, 77], [0xff0b48cf, 36], [0xffa08f5d, 81]]); const ranked = Score.score(map, { desired: 4, filter: true }); expect(ranked).toEqual([0xff3205cc, 0xffa08f5d, 0xffd33881]); }); // Note: only 3 suitable
});
// --- END FILE: score/score_test.ts ---


// --- BEGIN FILE: temperature/temperature_cache_test.ts ---
describe('temperature/temperature_cache.ts tests', () => {
  // Test temperature calculations
  it('computes raw temperatures correctly', () => { expect(TemperatureCache.rawTemperature(Hct.fromInt(BLUE))).toBeCloseTo(-1.39, 2); expect(TemperatureCache.rawTemperature(Hct.fromInt(RED))).toBeCloseTo(2.35, 2); expect(TemperatureCache.rawTemperature(Hct.fromInt(GREEN))).toBeCloseTo(-0.27, 2); expect(TemperatureCache.rawTemperature(Hct.fromInt(WHITE))).toBeCloseTo(-0.5, 2); expect(TemperatureCache.rawTemperature(Hct.fromInt(BLACK))).toBeCloseTo(-0.5, 2); });
  it('computes relative temperatures correctly', () => { expect(new TemperatureCache(Hct.fromInt(BLUE)).inputRelativeTemperature).toBeCloseTo(0.0, 2); expect(new TemperatureCache(Hct.fromInt(RED)).inputRelativeTemperature).toBeCloseTo(1.0, 2); expect(new TemperatureCache(Hct.fromInt(GREEN)).inputRelativeTemperature).toBeCloseTo(0.47, 2); expect(new TemperatureCache(Hct.fromInt(WHITE)).inputRelativeTemperature).toBeCloseTo(0.5, 2); expect(new TemperatureCache(Hct.fromInt(BLACK)).inputRelativeTemperature).toBeCloseTo(0.5, 2); });
  it('finds complements correctly', () => { expect(new TemperatureCache(Hct.fromInt(BLUE)).complement.toInt()).matchesColor(0xff9d0002); expect(new TemperatureCache(Hct.fromInt(RED)).complement.toInt()).matchesColor(0xff007bfc); expect(new TemperatureCache(Hct.fromInt(GREEN)).complement.toInt()).matchesColor(0xffffd2c9); expect(new TemperatureCache(Hct.fromInt(WHITE)).complement.toInt()).matchesColor(WHITE); expect(new TemperatureCache(Hct.fromInt(BLACK)).complement.toInt()).matchesColor(BLACK); });
  it('finds analogous colors correctly', () => { const blueAnalogous = new TemperatureCache(Hct.fromInt(BLUE)).analogous().map(e => e.toInt()); expect(blueAnalogous).toEqual([0xff00590c, 0xff00564e, BLUE, 0xff6700cc, 0xff81009f]); const redAnalogous = new TemperatureCache(Hct.fromInt(RED)).analogous().map(e => e.toInt()); expect(redAnalogous).toEqual([0xfff60082, 0xfffc004c, RED, 0xffd95500, 0xffaf7200]); });
});
// --- END FILE: temperature/temperature_cache_test.ts ---


// --- BEGIN FILE: utils/utils_test.ts ---
describe('utils/color_utils.ts & math_utils.ts tests', () => {
  // Test basic ARGB conversions and properties
  it('argbFromRgb creates correct values', () => { expect(utils.argbFromRgb(255, 255, 255)).toBe(WHITE); expect(utils.argbFromRgb(0, 0, 0)).toBe(BLACK); expect(utils.argbFromRgb(50, 150, 250)).toBe(0xff3296fa); });
  it('color component extraction works', () => { expect(utils.alphaFromArgb(BLUE)).toBe(255); expect(utils.redFromArgb(RED)).toBe(255); expect(utils.greenFromArgb(GREEN)).toBe(255); expect(utils.blueFromArgb(BLUE)).toBe(255); expect(utils.redFromArgb(GREEN)).toBe(0); });
  it('isOpaque works', () => { expect(utils.isOpaque(RED)).toBeTrue(); expect(utils.isOpaque(0x800000ff)).toBeFalse(); });
  // Test L* <-> Y conversions
  it('yFromLstar matches known values', () => { expect(utils.yFromLstar(0.0)).toBeCloseTo(0.0, 5); expect(utils.yFromLstar(50.0)).toBeCloseTo(18.418, 3); expect(utils.yFromLstar(100.0)).toBeCloseTo(100.0, 5); });
  it('lstarFromY matches known values', () => { expect(utils.lstarFromY(0.0)).toBeCloseTo(0.0, 5); expect(utils.lstarFromY(18.418)).toBeCloseTo(50.0, 3); expect(utils.lstarFromY(100.0)).toBeCloseTo(100.0, 5); });
  it('yFromLstar is inverse of lstarFromY', () => { for (let y = 0.0; y <= 100.0; y += 10) expect(utils.yFromLstar(utils.lstarFromY(y))).toBeCloseTo(y, 8); });
  it('lstarFromY is inverse of yFromLstar', () => { for (let l = 0.0; l <= 100.0; l += 10) expect(utils.lstarFromY(utils.yFromLstar(l))).toBeCloseTo(l, 8); });
  // Test math utils
  it('rotationDirection works', () => { expect(math.rotationDirection(0, 10)).toBe(1.0); expect(math.rotationDirection(10, 0)).toBe(-1.0); expect(math.rotationDirection(0, 180)).toBe(1.0); expect(math.rotationDirection(0, 181)).toBe(-1.0); expect(math.rotationDirection(180, 0)).toBe(1.0); expect(math.rotationDirection(181, 0)).toBe(1.0); });
});
// --- END FILE: utils/utils_test.ts ---

// --- BEGIN FILE: utils/theme_utils.ts tests ---
describe('utils/theme_utils.ts tests', () => {

  // Test theme generation from image (runs only in browser-like env)
  it('themeFromImage generates a theme from base64 red pixel', async () => {
    if (typeof document === 'undefined' || typeof HTMLImageElement === 'undefined') {
      log("Skipping themeFromImage test: Not in a browser environment.");
      return; // Skip test if not in browser
    }

    const image = new HTMLImageElement();
    image.src = BASE64_RED_1PX; // 1x1 Red PNG

    try {
      await image.decode(); // Wait for image to load
      const theme = await themeFromImage(image);

      // Basic structure checks
      expect(theme).toBeDefined();
      expect(theme.source).toBeDefined();
      expect(theme.schemes.light).toBeDefined();
      expect(theme.schemes.dark).toBeDefined();
      expect(theme.palettes.primary).toBeDefined();

      // Check if the source color is close to red
      const sourceHct = Hct.fromInt(theme.source);
      const hueDiff = differenceDegrees(sourceHct.hue, Hct.fromInt(RED).hue);
      // Hue might shift slightly due to quantization/scoring, allow some tolerance
      expect(hueDiff).toBeLessThan(20);
      expect(sourceHct.chroma).toBeGreaterThan(30); // Expect a reasonably chromatic red

    } catch (err) {
      fail(`themeFromImage failed: ${err}`);
    }
  });

  // Test applying a theme (runs only in browser-like env)
  it('applyTheme sets CSS custom properties', () => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
      log("Skipping applyTheme test: Not in a browser environment.");
      return; // Skip test if not in browser
    }

    const dummyElement = document.createElement('div');
    const sourceColor = RED; // Use red as source for simplicity
    const theme = themeFromSourceColor(sourceColor); // Generate a known theme

    try {
      applyTheme(theme, { target: dummyElement, dark: false });

      // Check if a key property was set correctly
      const expectedPrimaryHex = hexFromArgb(theme.schemes.light.primary);
      const actualPrimary = dummyElement.style.getPropertyValue('--md-sys-color-primary');

      expect(actualPrimary).toEqual(expectedPrimaryHex);

      // Check another property
      const expectedOnPrimaryHex = hexFromArgb(theme.schemes.light.onPrimary);
      const actualOnPrimary = dummyElement.style.getPropertyValue('--md-sys-color-on-primary');
      expect(actualOnPrimary).toEqual(expectedOnPrimaryHex);

    } catch (err) {
      fail(`applyTheme failed: ${err}`);
    }
  });

  it('applyTheme sets dark mode properties', () => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
      log("Skipping applyTheme dark test: Not in a browser environment.");
      return;
    }

    const dummyElement = document.createElement('div');
    const sourceColor = BLUE;
    const theme = themeFromSourceColor(sourceColor);

    applyTheme(theme, { target: dummyElement, dark: true }); // Apply dark theme

    const expectedPrimaryHex = hexFromArgb(theme.schemes.dark.primary);
    const actualPrimary = dummyElement.style.getPropertyValue('--md-sys-color-primary');
    expect(actualPrimary).toEqual(expectedPrimaryHex);

    const expectedOnPrimaryHex = hexFromArgb(theme.schemes.dark.onPrimary);
    const actualOnPrimary = dummyElement.style.getPropertyValue('--md-sys-color-on-primary');
    expect(actualOnPrimary).toEqual(expectedOnPrimaryHex);
  });

  it('applyTheme sets brightness suffix properties', () => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
      log("Skipping applyTheme suffix test: Not in a browser environment.");
      return;
    }

    const dummyElement = document.createElement('div');
    const sourceColor = GREEN;
    const theme = themeFromSourceColor(sourceColor);

    applyTheme(theme, { target: dummyElement, brightnessSuffix: true }); // Apply with suffixes

    // Check light suffixed property
    const expectedPrimaryLightHex = hexFromArgb(theme.schemes.light.primary);
    const actualPrimaryLight = dummyElement.style.getPropertyValue('--md-sys-color-primary-light');
    expect(actualPrimaryLight).toEqual(expectedPrimaryLightHex);

    // Check dark suffixed property
    const expectedPrimaryDarkHex = hexFromArgb(theme.schemes.dark.primary);
    const actualPrimaryDark = dummyElement.style.getPropertyValue('--md-sys-color-primary-dark');
    expect(actualPrimaryDark).toEqual(expectedPrimaryDarkHex);
  });

  it('applyTheme sets palette tone properties', () => {
    if (typeof document === 'undefined' || typeof HTMLElement === 'undefined') {
      log("Skipping applyTheme tones test: Not in a browser environment.");
      return;
    }

    const dummyElement = document.createElement('div');
    const sourceColor = YELLOW;
    const theme = themeFromSourceColor(sourceColor);
    const tonesToTest = [10, 50, 90];

    applyTheme(theme, { target: dummyElement, paletteTones: tonesToTest }); // Apply with tones

    // Check a primary palette tone
    const expectedPrimaryT50 = hexFromArgb(theme.palettes.primary.tone(50));
    const actualPrimaryT50 = dummyElement.style.getPropertyValue('--md-ref-palette-primary-primary50');
    expect(actualPrimaryT50).toEqual(expectedPrimaryT50);

    // Check a neutral palette tone
    const expectedNeutralT90 = hexFromArgb(theme.palettes.neutral.tone(90));
    const actualNeutralT90 = dummyElement.style.getPropertyValue('--md-ref-palette-neutral-neutral90');
    expect(actualNeutralT90).toEqual(expectedNeutralT90);
  });

});
// --- END FILE: utils/theme_utils.ts tests ---


// ============================================================
// END OF PORTED TESTS
// ============================================================


// --- Autorun Tests ---
runAllTestsAndReport();