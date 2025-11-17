import mongoose from 'mongoose';
import Question from '../models/Question';
import User from '../models/User';
import Organization from '../models/Organization';
import { QuestionType, DifficultyLevel, AssessmentStatus } from '../../../shared/src/types/common';

export async function seedQuestions() {
  try {
    // Find an admin user and organization to assign questions to
    const adminUser = await User.findOne({ role: 'admin' });
    const organization = await Organization.findOne();

    if (!adminUser || !organization) {
      console.error('Need at least one admin user and organization to seed questions');
      return;
    }

    // Clear existing questions
    await Question.deleteMany({});

    const questions = [
      // ===== CODING QUESTIONS =====
      {
        type: QuestionType.CODING,
        title: 'Two Sum',
        content: {
          prompt: `# Two Sum

Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

## Example 1:
\`\`\`
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
\`\`\`

## Example 2:
\`\`\`
Input: nums = [3,2,4], target = 6
Output: [1,2]
\`\`\`

## Constraints:
- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists.`,
          testCases: [
            {
              id: '1',
              input: '[2,7,11,15]\n9',
              expectedOutput: '[0,1]',
              isHidden: false,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '2',
              input: '[3,2,4]\n6',
              expectedOutput: '[1,2]',
              isHidden: false,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '3',
              input: '[3,3]\n6',
              expectedOutput: '[0,1]',
              isHidden: true,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '4',
              input: '[-1,-2,-3,-4,-5]\n-8',
              expectedOutput: '[2,4]',
              isHidden: true,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
          ],
          codeTemplate: `def two_sum(nums, target):
    """
    :type nums: List[int]
    :type target: int
    :rtype: List[int]
    """
    # Your code here
    pass

# Test with input
import json
nums = json.loads(input())
target = int(input())
result = two_sum(nums, target)
print(json.dumps(result))`,
          language: 'python',
        },
        tags: ['arrays', 'hash-table', 'easy'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 20,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.CODING,
        title: 'Valid Parentheses',
        content: {
          prompt: `# Valid Parentheses

Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

## Example 1:
\`\`\`
Input: s = "()"
Output: true
\`\`\`

## Example 2:
\`\`\`
Input: s = "()[]{}"
Output: true
\`\`\`

## Example 3:
\`\`\`
Input: s = "(]"
Output: false
\`\`\`

## Constraints:
- 1 <= s.length <= 10^4
- s consists of parentheses only '()[]{}'.`,
          testCases: [
            {
              id: '1',
              input: '()',
              expectedOutput: 'true',
              isHidden: false,
              points: 6,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '2',
              input: '()[]{}',
              expectedOutput: 'true',
              isHidden: false,
              points: 7,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '3',
              input: '(]',
              expectedOutput: 'false',
              isHidden: false,
              points: 7,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '4',
              input: '([)]',
              expectedOutput: 'false',
              isHidden: true,
              points: 10,
              timeLimit: 1000,
              memoryLimit: 256,
            },
          ],
          codeTemplate: `def is_valid(s):
    """
    :type s: str
    :rtype: bool
    """
    # Your code here
    pass

# Test with input
s = input().strip()
result = is_valid(s)
print(str(result).lower())`,
          language: 'python',
        },
        tags: ['stack', 'string', 'easy'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 30,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.CODING,
        title: 'Binary Tree Level Order Traversal',
        content: {
          prompt: `# Binary Tree Level Order Traversal

Given the \`root\` of a binary tree, return the level order traversal of its nodes' values. (i.e., from left to right, level by level).

## Example 1:
\`\`\`
Input: root = [3,9,20,null,null,15,7]
Output: [[3],[9,20],[15,7]]
\`\`\`

## Example 2:
\`\`\`
Input: root = [1]
Output: [[1]]
\`\`\`

## Example 3:
\`\`\`
Input: root = []
Output: []
\`\`\`

## Constraints:
- The number of nodes in the tree is in the range [0, 2000].
- -1000 <= Node.val <= 1000`,
          testCases: [
            {
              id: '1',
              input: '[3,9,20,null,null,15,7]',
              expectedOutput: '[[3],[9,20],[15,7]]',
              isHidden: false,
              points: 10,
              timeLimit: 2000,
              memoryLimit: 256,
            },
            {
              id: '2',
              input: '[1]',
              expectedOutput: '[[1]]',
              isHidden: false,
              points: 5,
              timeLimit: 2000,
              memoryLimit: 256,
            },
            {
              id: '3',
              input: '[]',
              expectedOutput: '[]',
              isHidden: true,
              points: 5,
              timeLimit: 2000,
              memoryLimit: 256,
            },
          ],
          codeTemplate: `from collections import deque
import json

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def level_order(root):
    """
    :type root: TreeNode
    :rtype: List[List[int]]
    """
    # Your code here
    pass

# Helper function to build tree from list
def build_tree(nodes):
    if not nodes:
        return None
    root = TreeNode(nodes[0])
    queue = deque([root])
    i = 1
    while queue and i < len(nodes):
        node = queue.popleft()
        if i < len(nodes) and nodes[i] is not None:
            node.left = TreeNode(nodes[i])
            queue.append(node.left)
        i += 1
        if i < len(nodes) and nodes[i] is not None:
            node.right = TreeNode(nodes[i])
            queue.append(node.right)
        i += 1
    return root

# Test with input
nodes = json.loads(input())
root = build_tree(nodes)
result = level_order(root)
print(json.dumps(result))`,
          language: 'python',
        },
        tags: ['tree', 'bfs', 'medium'],
        difficulty: DifficultyLevel.MEDIUM,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 20,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== MULTIPLE CHOICE QUESTIONS =====
      {
        type: QuestionType.MCQ_SINGLE,
        title: 'What is the time complexity of binary search?',
        content: {
          prompt: `# Time Complexity Analysis

What is the time complexity of the binary search algorithm when searching for an element in a sorted array of size n?`,
          options: [
            { id: '1', text: 'O(n)', isCorrect: false },
            { id: '2', text: 'O(log n)', isCorrect: true },
            { id: '3', text: 'O(n log n)', isCorrect: false },
            { id: '4', text: 'O(n²)', isCorrect: false },
          ],
          correctAnswer: '2',
        },
        tags: ['algorithms', 'complexity', 'data-structures'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 5,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.MCQ_SINGLE,
        title: 'Which data structure uses LIFO?',
        content: {
          prompt: `# Data Structures

Which of the following data structures follows the Last In First Out (LIFO) principle?`,
          options: [
            { id: '1', text: 'Queue', isCorrect: false },
            { id: '2', text: 'Stack', isCorrect: true },
            { id: '3', text: 'Linked List', isCorrect: false },
            { id: '4', text: 'Tree', isCorrect: false },
          ],
          correctAnswer: '2',
        },
        tags: ['data-structures', 'fundamentals'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 5,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.MCQ_SINGLE,
        title: 'REST API Methods',
        content: {
          prompt: `# RESTful APIs

Which HTTP method is typically used to update an existing resource in a RESTful API?`,
          options: [
            { id: '1', text: 'GET', isCorrect: false },
            { id: '2', text: 'POST', isCorrect: false },
            { id: '3', text: 'PUT', isCorrect: true },
            { id: '4', text: 'DELETE', isCorrect: false },
          ],
          correctAnswer: '3',
        },
        tags: ['web-development', 'apis', 'http'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 5,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== TRUE/FALSE QUESTIONS =====
      {
        type: QuestionType.MCQ_SINGLE,
        title: 'Python is a compiled language',
        content: {
          prompt: `# Programming Languages

**Statement:** Python is a compiled language.

Is this statement true or false?`,
          options: [
            { id: '1', text: 'True', isCorrect: false },
            { id: '2', text: 'False', isCorrect: true },
          ],
          correctAnswer: '2',
        },
        tags: ['python', 'programming-languages'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 3,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.MCQ_SINGLE,
        title: 'Arrays have constant time access',
        content: {
          prompt: `# Data Structures

**Statement:** Arrays provide O(1) time complexity for accessing elements by index.

Is this statement true or false?`,
          options: [
            { id: '1', text: 'True', isCorrect: true },
            { id: '2', text: 'False', isCorrect: false },
          ],
          correctAnswer: '1',
        },
        tags: ['data-structures', 'arrays', 'complexity'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 3,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== SHORT ANSWER QUESTIONS =====
      {
        type: QuestionType.FREEFORM,
        title: 'What is a hash collision?',
        content: {
          prompt: `# Hash Tables

Explain what a hash collision is and name one method to handle hash collisions.

*Expected length: 2-3 sentences*`,
        },
        tags: ['hash-tables', 'data-structures', 'theory'],
        difficulty: DifficultyLevel.MEDIUM,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 10,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.FREEFORM,
        title: 'Difference between let and var in JavaScript',
        content: {
          prompt: `# JavaScript Fundamentals

Explain the key differences between \`let\` and \`var\` in JavaScript.

*Expected length: 2-4 sentences*`,
        },
        tags: ['javascript', 'web-development', 'fundamentals'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 8,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== ESSAY QUESTIONS =====
      {
        type: QuestionType.LONG_FORM,
        title: 'Database Normalization',
        content: {
          prompt: `# Database Design

## Question
Explain the concept of database normalization and describe the first three normal forms (1NF, 2NF, 3NF).

For each normal form:
1. Define what it means
2. Explain what problem it solves
3. Provide a brief example

*Expected length: 300-500 words*`,
        },
        tags: ['databases', 'sql', 'design', 'theory'],
        difficulty: DifficultyLevel.MEDIUM,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 25,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.LONG_FORM,
        title: 'Microservices Architecture',
        content: {
          prompt: `# System Design

## Question
Discuss the advantages and disadvantages of microservices architecture compared to monolithic architecture.

Your answer should cover:
- Definition of both architectures
- At least 3 advantages of microservices
- At least 3 disadvantages of microservices
- When would you choose one over the other?

*Expected length: 400-600 words*`,
        },
        tags: ['system-design', 'architecture', 'microservices'],
        difficulty: DifficultyLevel.HARD,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 30,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== FILE UPLOAD QUESTIONS =====
      {
        type: QuestionType.FILE_UPLOAD,
        title: 'Submit Your Portfolio Website',
        content: {
          prompt: `# Web Development Project

## Requirements
Create a personal portfolio website and submit the complete source code.

Your portfolio must include:
- Home page with bio/introduction
- Projects section showcasing at least 2 projects
- Contact form or contact information
- Responsive design (mobile-friendly)
- Clean, professional styling

## Submission
Upload a ZIP file containing:
- All HTML, CSS, and JavaScript files
- A README.md explaining how to run the project
- Screenshots of your website

## Evaluation Criteria
- Code quality and organization (40%)
- Design and user experience (30%)
- Responsiveness and browser compatibility (20%)
- Documentation (10%)`,
          allowedFileTypes: ['.zip', '.rar', '.tar.gz'],
          maxFileSize: 52428800, // 50MB
        },
        tags: ['web-development', 'html', 'css', 'javascript', 'project'],
        difficulty: DifficultyLevel.MEDIUM,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 50,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.FILE_UPLOAD,
        title: 'Machine Learning Model Submission',
        content: {
          prompt: `# Machine Learning Challenge

## Task
Build a machine learning model to predict housing prices using the provided dataset.

## Requirements
- Use the provided CSV dataset
- Implement at least 2 different algorithms
- Include feature engineering and data preprocessing
- Achieve at least 85% accuracy on test set

## Submission
Upload a ZIP file containing:
- Jupyter notebook with your analysis
- Python scripts for model training
- requirements.txt for dependencies
- README.md with instructions and results

## Dataset
Download from: [link to dataset]`,
          allowedFileTypes: ['.zip', '.tar.gz'],
          maxFileSize: 104857600, // 100MB
        },
        tags: ['machine-learning', 'python', 'data-science', 'project'],
        difficulty: DifficultyLevel.HARD,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 100,
        status: AssessmentStatus.PUBLISHED,
      },

      // ===== MORE CODING QUESTIONS =====
      {
        type: QuestionType.CODING,
        title: 'FizzBuzz',
        content: {
          prompt: `# FizzBuzz

Write a program that prints the numbers from 1 to n. But for multiples of three print "Fizz" instead of the number and for the multiples of five print "Buzz". For numbers which are multiples of both three and five print "FizzBuzz".

## Example:
\`\`\`
Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]
\`\`\`

## Constraints:
- 1 <= n <= 10^4`,
          testCases: [
            {
              id: '1',
              input: '15',
              expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]',
              isHidden: false,
              points: 10,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '2',
              input: '5',
              expectedOutput: '["1","2","Fizz","4","Buzz"]',
              isHidden: false,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
            {
              id: '3',
              input: '3',
              expectedOutput: '["1","2","Fizz"]',
              isHidden: true,
              points: 5,
              timeLimit: 1000,
              memoryLimit: 256,
            },
          ],
          codeTemplate: `import json

def fizz_buzz(n):
    """
    :type n: int
    :rtype: List[str]
    """
    # Your code here
    pass

# Test with input
n = int(input())
result = fizz_buzz(n)
print(json.dumps(result))`,
          language: 'python',
        },
        tags: ['strings', 'easy', 'classic'],
        difficulty: DifficultyLevel.EASY,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 20,
        status: AssessmentStatus.PUBLISHED,
      },
      {
        type: QuestionType.CODING,
        title: 'Longest Common Subsequence',
        content: {
          prompt: `# Longest Common Subsequence

Given two strings \`text1\` and \`text2\`, return the length of their longest common subsequence. If there is no common subsequence, return 0.

A subsequence of a string is a new string generated from the original string with some characters (can be none) deleted without changing the relative order of the remaining characters.

## Example 1:
\`\`\`
Input: text1 = "abcde", text2 = "ace"
Output: 3
Explanation: The longest common subsequence is "ace" and its length is 3.
\`\`\`

## Example 2:
\`\`\`
Input: text1 = "abc", text2 = "abc"
Output: 3
Explanation: The longest common subsequence is "abc" and its length is 3.
\`\`\`

## Constraints:
- 1 <= text1.length, text2.length <= 1000
- text1 and text2 consist of only lowercase English characters.`,
          testCases: [
            {
              id: '1',
              input: 'abcde\nace',
              expectedOutput: '3',
              isHidden: false,
              points: 10,
              timeLimit: 2000,
              memoryLimit: 512,
            },
            {
              id: '2',
              input: 'abc\nabc',
              expectedOutput: '3',
              isHidden: false,
              points: 5,
              timeLimit: 2000,
              memoryLimit: 512,
            },
            {
              id: '3',
              input: 'abc\ndef',
              expectedOutput: '0',
              isHidden: true,
              points: 5,
              timeLimit: 2000,
              memoryLimit: 512,
            },
          ],
          codeTemplate: `def longest_common_subsequence(text1, text2):
    """
    :type text1: str
    :type text2: str
    :rtype: int
    """
    # Your code here
    pass

# Test with input
text1 = input().strip()
text2 = input().strip()
result = longest_common_subsequence(text1, text2)
print(result)`,
          language: 'python',
        },
        tags: ['dynamic-programming', 'strings', 'medium'],
        difficulty: DifficultyLevel.MEDIUM,
        authorId: adminUser._id,
        organizationId: organization._id,
        points: 20,
        status: AssessmentStatus.PUBLISHED,
      },
    ];

    // Insert all questions
    const createdQuestions = await Question.insertMany(questions);
    console.log(`✅ Successfully seeded ${createdQuestions.length} questions`);

    return createdQuestions;
  } catch (error) {
    console.error('Error seeding questions:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-app';

  mongoose
    .connect(mongoUri)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedQuestions();
      await mongoose.connection.close();
      console.log('Database connection closed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
}
