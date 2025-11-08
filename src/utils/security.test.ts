/**
 * Tests for security utilities
 * 
 * Run with: node security.test.js
 */

import {
  SecurityLogger,
  SecurityEventType,
  PathValidator,
  ApiKeyEncryption,
  UrlValidator,
  SecurityAudit
} from './security';

console.log('=== Security Utilities Test Suite ===\n');

// Test 1: Path Validation
console.log('--- Test 1: Path Validation ---');

// Valid paths
const validPaths = [
  'file.txt',
  'folder/file.txt',
  'deep/nested/path/file.txt',
  './relative/path.txt',
  ''
];

console.log('Testing valid paths:');
validPaths.forEach(path => {
  const result = PathValidator.validatePath(path);
  console.log(`  "${path}": ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
  if (!result.valid) {
    console.log(`    Error: ${result.error}`);
  }
});

// Invalid paths
const invalidPaths = [
  '../parent/file.txt',
  'folder/../../../etc/passwd',
  '/absolute/path.txt',
  'path/with/\0/null.txt'
];

console.log('\nTesting invalid paths (should fail):');
invalidPaths.forEach(path => {
  const result = PathValidator.validatePath(path);
  console.log(`  "${path}": ${!result.valid ? '✓ PASS (correctly rejected)' : '✗ FAIL (should be rejected)'}`);
  if (!result.valid) {
    console.log(`    Error: ${result.error}`);
  }
});

// Test 2: API Key Encryption
console.log('\n--- Test 2: API Key Encryption ---');

const testApiKeys = [
  'sk-1234567890abcdef',
  'sk-ant-api03-test-key-here',
  'test-local-key-123'
];

console.log('Testing API key encryption/decryption:');
testApiKeys.forEach(key => {
  try {
    const encrypted = ApiKeyEncryption.encrypt(key);
    const decrypted = ApiKeyEncryption.decrypt(encrypted);
    const isEncrypted = ApiKeyEncryption.isEncrypted(encrypted);
    
    const success = decrypted === key && isEncrypted;
    console.log(`  Original: ${key.substring(0, 15)}...`);
    console.log(`  Encrypted: ${encrypted.substring(0, 30)}...`);
    console.log(`  Decrypted matches: ${success ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Is encrypted: ${isEncrypted ? '✓ PASS' : '✗ FAIL'}`);
  } catch (error) {
    console.log(`  ✗ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Test backward compatibility
console.log('\nTesting backward compatibility (unencrypted keys):');
const unencryptedKey = 'sk-plain-text-key';
const decrypted = ApiKeyEncryption.decrypt(unencryptedKey);
console.log(`  Unencrypted key: ${unencryptedKey}`);
console.log(`  Decrypted: ${decrypted}`);
console.log(`  Matches: ${decrypted === unencryptedKey ? '✓ PASS' : '✗ FAIL'}`);

// Test 3: URL Validation
console.log('\n--- Test 3: URL Validation ---');

const secureUrls = [
  'https://api.openai.com/v1',
  'https://openrouter.ai/api/v1',
  'http://localhost:8000/v1',
  'http://127.0.0.1:8080/v1'
];

console.log('Testing secure URLs (should pass):');
secureUrls.forEach(url => {
  const result = UrlValidator.validateSecureUrl(url);
  console.log(`  ${url}: ${result.valid ? '✓ PASS' : '✗ FAIL'}`);
  if (!result.valid) {
    console.log(`    Error: ${result.error}`);
  }
});

const insecureUrls = [
  'http://api.example.com/v1',
  'ftp://server.com/data',
  'file:///etc/passwd'
];

console.log('\nTesting insecure URLs (should fail):');
insecureUrls.forEach(url => {
  const result = UrlValidator.validateSecureUrl(url);
  console.log(`  ${url}: ${!result.valid ? '✓ PASS (correctly rejected)' : '✗ FAIL (should be rejected)'}`);
  if (!result.valid) {
    console.log(`    Error: ${result.error}`);
  }
});

// Test provider URL validation
console.log('\nTesting provider URL validation:');
const providers = [
  { provider: 'openrouter', baseUrl: undefined, shouldPass: true },
  { provider: 'openai', baseUrl: undefined, shouldPass: true },
  { provider: 'anthropic', baseUrl: undefined, shouldPass: true },
  { provider: 'local', baseUrl: 'https://localhost:8000', shouldPass: true },
  { provider: 'local', baseUrl: 'http://example.com', shouldPass: false }
];

providers.forEach(({ provider, baseUrl, shouldPass }) => {
  const result = UrlValidator.validateProviderUrl(provider, baseUrl);
  const passed = result.valid === shouldPass;
  console.log(`  ${provider} (${baseUrl || 'default'}): ${passed ? '✓ PASS' : '✗ FAIL'}`);
  if (!result.valid) {
    console.log(`    Error: ${result.error}`);
  }
});

// Test 4: Security Logging
console.log('\n--- Test 4: Security Logging ---');

// Clear previous events
SecurityLogger.clearEvents();

// Log various events
console.log('Logging security events:');
SecurityLogger.logEvent(
  SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
  'Test path traversal attempt',
  'high',
  { path: '../etc/passwd' }
);

SecurityLogger.logEvent(
  SecurityEventType.API_KEY_VALIDATION,
  'Test API key validation',
  'low'
);

SecurityLogger.logEvent(
  SecurityEventType.UNAUTHORIZED_FILE_ACCESS,
  'Test unauthorized access',
  'medium',
  { path: '/root/secret.txt' }
);

// Get events
const recentEvents = SecurityLogger.getRecentEvents(10);
console.log(`  Total events logged: ${recentEvents.length}`);

const pathTraversalEvents = SecurityLogger.getEventsByType(
  SecurityEventType.PATH_TRAVERSAL_ATTEMPT
);
console.log(`  Path traversal events: ${pathTraversalEvents.length}`);

// Test 5: Security Audit
console.log('\n--- Test 5: Security Audit ---');

const report = SecurityAudit.generateReport();
console.log('Security audit report:');
console.log(`  Total events: ${report.totalEvents}`);
console.log(`  High severity events: ${report.highSeverityEvents}`);
console.log(`  Events by type:`);
Object.entries(report.eventsByType).forEach(([type, count]) => {
  console.log(`    ${type}: ${count}`);
});

const hasCritical = SecurityAudit.hasCriticalIssues();
console.log(`  Has critical issues: ${hasCritical ? 'YES' : 'NO'}`);

// Test 6: Log Message Sanitization
console.log('\n--- Test 6: Log Message Sanitization ---');

// This is tested internally by SecurityLogger
console.log('Testing sensitive data sanitization:');
SecurityLogger.logEvent(
  SecurityEventType.API_KEY_VALIDATION,
  'API key sk-1234567890abcdefghijklmnop used for validation',
  'low'
);

SecurityLogger.logEvent(
  SecurityEventType.API_KEY_VALIDATION,
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
  'low'
);

SecurityLogger.logEvent(
  SecurityEventType.API_KEY_VALIDATION,
  'password=mysecretpassword123',
  'low'
);

const sanitizedEvents = SecurityLogger.getRecentEvents(3);
console.log('  Checking if sensitive data was sanitized:');
sanitizedEvents.forEach(event => {
  const hasSensitive = 
    event.details.includes('sk-') ||
    event.details.includes('Bearer ey') ||
    event.details.includes('password=my');
  console.log(`    ${hasSensitive ? '✗ FAIL (sensitive data leaked)' : '✓ PASS (data sanitized)'}`);
  console.log(`    Message: ${event.details}`);
});

console.log('\n=== All Tests Complete ===');
