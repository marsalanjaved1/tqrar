/**
 * Test file to demonstrate ToolExecutionTracker functionality
 * This verifies the core execution tracking features
 */

import { ToolExecutionTracker } from './ToolExecutionTracker';
import { IToolCall, IToolResult } from '../types';

/**
 * Test basic execution tracking lifecycle
 */
function testBasicExecutionLifecycle() {
  console.log('=== Testing Basic Execution Lifecycle ===\n');

  const tracker = new ToolExecutionTracker();

  // Create a sample tool call
  const toolCall: IToolCall = {
    id: 'call_123',
    type: 'function',
    function: {
      name: 'createCell',
      arguments: JSON.stringify({ cellType: 'code', content: 'print("Hello")' })
    }
  };

  // Track execution start
  const executionId = tracker.startExecution(toolCall);
  console.log('Started execution:', executionId);

  // Get execution
  const execution = tracker.getExecution(executionId);
  console.log('Execution status:', execution?.status);
  console.log('Execution tool:', execution?.toolCall.function.name);

  // Simulate successful completion
  const result: IToolResult = {
    success: true,
    data: { cellIndex: 3 }
  };
  tracker.completeExecution(executionId, result);

  // Verify completion
  const completedExecution = tracker.getExecution(executionId);
  console.log('Final status:', completedExecution?.status);
  console.log('Duration:', completedExecution?.duration, 'ms');
  console.log('Result:', completedExecution?.result);
  console.log();
}

/**
 * Test error handling
 */
function testErrorHandling() {
  console.log('=== Testing Error Handling ===\n');

  const tracker = new ToolExecutionTracker();

  const toolCall: IToolCall = {
    id: 'call_456',
    type: 'function',
    function: {
      name: 'readFile',
      arguments: JSON.stringify({ path: '/nonexistent/file.txt' })
    }
  };

  const executionId = tracker.startExecution(toolCall);
  console.log('Started execution:', executionId);

  // Simulate error
  const error = new Error('File not found');
  tracker.failExecution(executionId, error);

  // Verify error
  const failedExecution = tracker.getExecution(executionId);
  console.log('Final status:', failedExecution?.status);
  console.log('Error message:', failedExecution?.error?.message);
  console.log('Error type:', failedExecution?.error?.type);
  console.log();
}

/**
 * Test event emission
 */
function testEventEmission() {
  console.log('=== Testing Event Emission ===\n');

  const tracker = new ToolExecutionTracker();

  // Set up event listeners
  tracker.on('execution:start', (event) => {
    console.log('Event: execution:start -', event.toolCall.function.name);
  });

  tracker.on('execution:complete', (event) => {
    console.log('Event: execution:complete -', event.toolCall.function.name, 'in', event.duration, 'ms');
  });

  tracker.on('execution:error', (event) => {
    console.log('Event: execution:error -', event.toolCall.function.name, '-', event.error?.message);
  });

  // Test successful execution
  const toolCall1: IToolCall = {
    id: 'call_789',
    type: 'function',
    function: {
      name: 'updateCell',
      arguments: JSON.stringify({ index: 0, content: 'updated' })
    }
  };

  const id1 = tracker.startExecution(toolCall1);
  tracker.completeExecution(id1, { success: true });

  // Test failed execution
  const toolCall2: IToolCall = {
    id: 'call_101',
    type: 'function',
    function: {
      name: 'deleteCell',
      arguments: JSON.stringify({ index: 999 })
    }
  };

  const id2 = tracker.startExecution(toolCall2);
  tracker.failExecution(id2, new Error('Cell index out of range'));

  console.log();
}

/**
 * Test multiple executions
 */
function testMultipleExecutions() {
  console.log('=== Testing Multiple Executions ===\n');

  const tracker = new ToolExecutionTracker();

  // Create multiple executions
  const toolCalls: IToolCall[] = [
    {
      id: 'call_1',
      type: 'function',
      function: { name: 'getCells', arguments: '{}' }
    },
    {
      id: 'call_2',
      type: 'function',
      function: { name: 'createCell', arguments: '{"cellType":"code"}' }
    },
    {
      id: 'call_3',
      type: 'function',
      function: { name: 'updateCell', arguments: '{"index":0}' }
    }
  ];

  const executionIds = toolCalls.map(tc => tracker.startExecution(tc));

  // Complete them
  executionIds.forEach((id, index) => {
    tracker.completeExecution(id, { success: true, data: { index } });
  });

  // Verify all executions
  const allExecutions = tracker.getAllExecutions();
  console.log('Total executions:', allExecutions.length);
  console.log('Execution count:', tracker.executionCount);

  allExecutions.forEach((exec, index) => {
    console.log(`Execution ${index + 1}:`, exec.toolCall.function.name, '-', exec.status);
  });

  console.log();
}

/**
 * Test clear functionality
 */
function testClearFunctionality() {
  console.log('=== Testing Clear Functionality ===\n');

  const tracker = new ToolExecutionTracker();

  // Add some executions
  const toolCall: IToolCall = {
    id: 'call_clear',
    type: 'function',
    function: { name: 'test', arguments: '{}' }
  };

  tracker.startExecution(toolCall);
  tracker.startExecution(toolCall);
  tracker.startExecution(toolCall);

  console.log('Executions before clear:', tracker.executionCount);

  // Clear
  tracker.clear();

  console.log('Executions after clear:', tracker.executionCount);
  console.log('All executions:', tracker.getAllExecutions().length);

  console.log();
}

/**
 * Test status updates
 */
function testStatusUpdates() {
  console.log('=== Testing Status Updates ===\n');

  const tracker = new ToolExecutionTracker();

  tracker.on('execution:update', (event) => {
    console.log('Status updated to:', event.status);
  });

  const toolCall: IToolCall = {
    id: 'call_status',
    type: 'function',
    function: { name: 'longRunningTask', arguments: '{}' }
  };

  const id = tracker.startExecution(toolCall);
  console.log('Initial status:', tracker.getExecution(id)?.status);

  // Update status
  tracker.updateStatus(id, 'running');
  console.log('After update:', tracker.getExecution(id)?.status);

  console.log();
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('ToolExecutionTracker Test Suite\n');
  console.log('================================\n');

  testBasicExecutionLifecycle();
  testErrorHandling();
  testEventEmission();
  testMultipleExecutions();
  testClearFunctionality();
  testStatusUpdates();

  console.log('================================\n');
  console.log('All tests completed successfully!\n');
}

// Export for use in other modules
export { runAllTests };

// Run if executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}
