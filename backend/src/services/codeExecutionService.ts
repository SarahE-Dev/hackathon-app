import { spawn } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';

export interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsage?: number;
  timeout?: boolean;
}

export interface TestCaseResult {
  id: string;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  executionTime: number;
  error?: string;
}

export class CodeExecutionService {
  private static readonly PYTHON_EXECUTABLE = 'python3';
  private static readonly TIMEOUT_MS = 5000; // 5 seconds
  private static readonly MEMORY_LIMIT_MB = 256;

  /**
   * Execute Python code with test cases
   */
  static async executePythonCode(
    code: string,
    testCases: Array<{ id: string; input: string; expectedOutput: string }>,
    timeLimit: number = 1000,
    memoryLimit: number = 256
  ): Promise<TestCaseResult[]> {
    const results: TestCaseResult[] = [];

    for (const testCase of testCases) {
      try {
        const result = await this.runPythonTest(code, testCase, timeLimit);
        results.push({
          id: testCase.id,
          passed: result.success && result.output.trim() === testCase.expectedOutput.trim(),
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output,
          executionTime: result.executionTime,
          error: result.error,
        });
      } catch (error) {
        results.push({
          id: testCase.id,
          passed: false,
          input: testCase.input,
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          executionTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Run a single Python test case
   */
  private static async runPythonTest(
    code: string,
    testCase: { id: string; input: string; expectedOutput: string },
    timeLimit: number
  ): Promise<CodeExecutionResult> {
    const tempDir = tmpdir();
    const tempFile = join(tempDir, `code_${uuidv4()}.py`);

    try {
      // Create a wrapper script that executes the code with the test input
      const wrapperCode = this.createPythonWrapper(code, testCase.input);

      // Write to temporary file
      await writeFile(tempFile, wrapperCode, 'utf8');

      // Execute with timeout
      const startTime = Date.now();
      const result = await this.executeWithTimeout(tempFile, Math.min(timeLimit, this.TIMEOUT_MS));
      const executionTime = Date.now() - startTime;

      return {
        ...result,
        executionTime,
      };
    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Create a Python wrapper script that captures output
   */
  private static createPythonWrapper(userCode: string, inputData: string): string {
    return `
import sys
from io import StringIO

# Capture stdout
old_stdout = sys.stdout
sys.stdout = captured_output = StringIO()

try:
    # User code
    ${userCode}

    # Simulate input if needed
    input_data = """${inputData}"""
    if input_data.strip():
        # Mock input function for simple cases
        input_values = [line.strip() for line in input_data.split('\\n') if line.strip()]
        input_index = 0

        def mock_input(prompt=""):
            global input_index
            if input_index < len(input_values):
                result = input_values[input_index]
                input_index += 1
                return result
            return ""

        # Replace built-in input
        builtins = sys.modules['builtins']
        builtins.input = mock_input

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
finally:
    # Restore stdout and print captured output
    sys.stdout = old_stdout
    captured = captured_output.getvalue()
    if captured:
        print(captured, end='')
`;
  }

  /**
   * Execute Python file with timeout
   */
  private static executeWithTimeout(filePath: string, timeoutMs: number): Promise<CodeExecutionResult> {
    return new Promise((resolve) => {
      const child = spawn(this.PYTHON_EXECUTABLE, [filePath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONPATH: '' },
      });

      let output = '';
      let errorOutput = '';
      let timeout = false;

      // Set timeout
      const timeoutId = setTimeout(() => {
        timeout = true;
        child.kill('SIGTERM');
      }, timeoutMs);

      // Capture stdout
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        const success = code === 0 && !timeout;
        const finalError = timeout ? 'Execution timeout' : errorOutput || undefined;

        resolve({
          success,
          output: output.trim(),
          error: finalError,
          executionTime: 0, // Will be set by caller
          timeout,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          output: '',
          error: error.message,
          executionTime: 0,
          timeout: false,
        });
      });
    });
  }

  /**
   * Validate Python syntax
   */
  static async validatePythonSyntax(code: string): Promise<{ valid: boolean; error?: string }> {
    const tempDir = tmpdir();
    const tempFile = join(tempDir, `syntax_check_${uuidv4()}.py`);

    try {
      await writeFile(tempFile, code, 'utf8');

      return new Promise((resolve) => {
        const child = spawn(this.PYTHON_EXECUTABLE, ['-m', 'py_compile', tempFile], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let errorOutput = '';

        child.stderr?.on('data', (data) => {
          errorOutput += data.toString();
        });

        child.on('close', (code) => {
          resolve({
            valid: code === 0,
            error: code !== 0 ? errorOutput : undefined,
          });
        });
      });
    } finally {
      try {
        await unlink(tempFile);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

export default CodeExecutionService;
