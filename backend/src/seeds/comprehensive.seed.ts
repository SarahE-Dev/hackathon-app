import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import Organization from '../models/Organization';
import Assessment from '../models/Assessment';
import Question from '../models/Question';
import Team from '../models/Team';
import HackathonSession from '../models/HackathonSession';
import { logger } from '../utils/logger';

export async function seedComprehensive() {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Assessment.deleteMany({});
    await Question.deleteMany({});
    await Team.deleteMany({});
    await HackathonSession.deleteMany({});

    logger.info('Cleared existing data');

    // Create Organization
    const organization = await Organization.create({
      name: 'Justice Through Code',
      slug: 'justice-through-code',
      settings: {
        allowSelfRegistration: true,
      },
    });
    logger.info(`Created organization: ${organization.name}`);

    // Create Users with different roles
    const hashedPassword = await bcrypt.hash('Demo@123456', 10);

    const users = await User.create([
      // Admin
      {
        email: 'admin@codearena.edu',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: [
          { role: 'admin', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Judge
      {
        email: 'judge@codearena.edu',
        passwordHash: hashedPassword,
        firstName: 'Judge',
        lastName: 'Evaluator',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Additional Judges for team evaluation
      {
        email: 'judge2@codearena.edu',
        passwordHash: hashedPassword,
        firstName: 'Michael',
        lastName: 'Chen',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      {
        email: 'judge3@codearena.edu',
        passwordHash: hashedPassword,
        firstName: 'Emily',
        lastName: 'Rodriguez',
        roles: [
          { role: 'judge', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Main Fellow for login testing
      {
        email: 'fellow@codearena.edu',
        passwordHash: hashedPassword,
        firstName: 'Student',
        lastName: 'Fellow',
        roles: [
          { role: 'fellow', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      },
      // Additional Fellows (JTC Participants)
      ...Array.from({ length: 19 }, (_, i) => ({
        email: `fellow${i + 1}@codearena.edu`,
        passwordHash: hashedPassword,
        firstName: ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Dakota', 'Avery'][i % 8],
        lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][i % 5],
        roles: [
          { role: 'fellow', organizationId: organization._id },
        ],
        isActive: true,
        emailVerified: true,
      })),
    ]);

    const [admin, judge1, judge2, judge3, ...fellows] = users;
    logger.info(`Created ${users.length} users`);

    // Create Questions for Assessments
    const questions = await Question.create([
      {
        title: 'What is JavaScript?',
        type: 'mcq-single',
        content: {
          prompt: 'What is JavaScript?',
          options: [
            { id: 'a', text: 'A server-side language', isCorrect: false },
            { id: 'b', text: 'A client-side scripting language', isCorrect: true },
            { id: 'c', text: 'A database language', isCorrect: false },
            { id: 'd', text: 'A markup language', isCorrect: false },
          ],
          correctAnswer: 'b',
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Variable Declaration in JavaScript',
        type: 'mcq-single',
        content: {
          prompt: 'Which keyword is used to declare a constant variable in JavaScript?',
          options: [
            { id: 'a', text: 'const', isCorrect: true },
            { id: 'b', text: 'var', isCorrect: false },
            { id: 'c', text: 'let', isCorrect: false },
            { id: 'd', text: 'static', isCorrect: false },
          ],
          correctAnswer: 'a',
        },
        points: 10,
        difficulty: 'easy',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Array Methods in JavaScript',
        type: 'mcq-multi',
        content: {
          prompt: 'Which of the following are array methods in JavaScript? (Select all that apply)',
          options: [
            { id: 'a', text: 'map()', isCorrect: true },
            { id: 'b', text: 'filter()', isCorrect: true },
            { id: 'c', text: 'execute()', isCorrect: false },
            { id: 'd', text: 'reduce()', isCorrect: true },
          ],
          correctAnswer: ['a', 'b', 'd'],
        },
        points: 15,
        difficulty: 'medium',
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      // ===== HACKATHON CODING PROBLEMS (Python) =====
      {
        title: 'Two Sum',
        type: 'coding',
        content: {
          prompt: `Given a list of integers and a target sum, return the indices of the two numbers that add up to the target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example:**
Input: nums = [2, 7, 11, 15], target = 9
Output: [0, 1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9

**Constraints:**
- 2 <= len(nums) <= 1000
- -10^9 <= nums[i] <= 10^9
- Only one valid answer exists`,
          codeTemplate: `def two_sum(nums, target):
    # Your code here
    # Return a list of two indices [i, j] where nums[i] + nums[j] == target
    pass

# Read input - first line is the array, second line is target
import json
nums = json.loads(input())  # e.g., [2, 7, 11, 15]
target = int(input())       # e.g., 9
result = two_sum(nums, target)
print(json.dumps(result))   # Output as JSON array`,
          language: 'python',
          testCases: [
            { id: '1', input: '[2, 7, 11, 15]\n9', expectedOutput: '[0, 1]', isHidden: false, points: 10 },
            { id: '2', input: '[3, 2, 4]\n6', expectedOutput: '[1, 2]', isHidden: false, points: 10 },
            { id: '3', input: '[3, 3]\n6', expectedOutput: '[0, 1]', isHidden: true, points: 10 },
            { id: '4', input: '[1, 5, 3, 7, 2]\n9', expectedOutput: '[1, 3]', isHidden: true, points: 10 },
          ],
        },
        points: 40,
        difficulty: 'easy',
        tags: ['arrays', 'hash-table'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Reverse String',
        type: 'coding',
        content: {
          prompt: `Write a function that reverses a string. The input string is given as a list of characters.

You must do this by modifying the input list in-place with O(1) extra memory.

**Example 1:**
Input: ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

**Example 2:**
Input: ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]`,
          codeTemplate: `def reverse_string(s):
    # Your code here - modify s in-place
    # s is a list of characters
    pass

# Read input as JSON array of characters
import json
s = json.loads(input())  # e.g., ["h","e","l","l","o"]
reverse_string(s)
print(json.dumps(s))     # Output as JSON array`,
          language: 'python',
          testCases: [
            { id: '1', input: '["h","e","l","l","o"]', expectedOutput: '["o","l","l","e","h"]', isHidden: false, points: 10 },
            { id: '2', input: '["H","a","n","n","a","h"]', expectedOutput: '["h","a","n","n","a","H"]', isHidden: false, points: 10 },
            { id: '3', input: '["a"]', expectedOutput: '["a"]', isHidden: true, points: 10 },
            { id: '4', input: '["P","y","t","h","o","n"]', expectedOutput: '["n","o","h","t","y","P"]', isHidden: true, points: 10 },
          ],
        },
        points: 40,
        difficulty: 'easy',
        tags: ['strings', 'two-pointers'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'FizzBuzz',
        type: 'coding',
        content: {
          prompt: `Given an integer n, return a list of strings where:
- "FizzBuzz" if the number is divisible by both 3 and 5
- "Fizz" if the number is divisible by 3
- "Buzz" if the number is divisible by 5
- The number itself as a string otherwise

**Example:**
Input: n = 15
Output: ["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]`,
          codeTemplate: `def fizz_buzz(n):
    # Your code here
    result = []
    return result

# Read input
n = int(input())
result = fizz_buzz(n)
print(' '.join(result))`,
          language: 'python',
          testCases: [
            { id: '1', input: '3', expectedOutput: '1 2 Fizz', isHidden: false, points: 10 },
            { id: '2', input: '5', expectedOutput: '1 2 Fizz 4 Buzz', isHidden: false, points: 10 },
            { id: '3', input: '15', expectedOutput: '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz', isHidden: true, points: 15 },
          ],
        },
        points: 35,
        difficulty: 'easy',
        tags: ['math', 'strings'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Valid Palindrome',
        type: 'coding',
        content: {
          prompt: `A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.

Given a string s, return True if it is a palindrome, or False otherwise.

**Example 1:**
Input: "A man, a plan, a canal: Panama"
Output: True
Explanation: "amanaplanacanalpanama" is a palindrome.

**Example 2:**
Input: "race a car"
Output: False
Explanation: "raceacar" is not a palindrome.`,
          codeTemplate: `def is_palindrome(s):
    # Your code here
    pass

# Read input
s = input()
result = is_palindrome(s)
print(result)`,
          language: 'python',
          testCases: [
            { id: '1', input: 'A man, a plan, a canal: Panama', expectedOutput: 'True', isHidden: false, points: 15 },
            { id: '2', input: 'race a car', expectedOutput: 'False', isHidden: false, points: 15 },
            { id: '3', input: ' ', expectedOutput: 'True', isHidden: true, points: 10 },
            { id: '4', input: 'Was it a car or a cat I saw?', expectedOutput: 'True', isHidden: true, points: 10 },
          ],
        },
        points: 50,
        difficulty: 'medium',
        tags: ['strings', 'two-pointers'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Maximum Subarray',
        type: 'coding',
        content: {
          prompt: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

A subarray is a contiguous non-empty sequence of elements within an array.

**Example 1:**
Input: nums = [-2,1,-3,4,-1,2,1,-5,4]
Output: 6
Explanation: The subarray [4,-1,2,1] has the largest sum 6.

**Example 2:**
Input: nums = [1]
Output: 1

**Example 3:**
Input: nums = [5,4,-1,7,8]
Output: 23`,
          codeTemplate: `def max_subarray(nums):
    # Your code here - use Kadane's algorithm
    pass

# Read input as JSON array
import json
nums = json.loads(input())  # e.g., [-2, 1, -3, 4, -1, 2, 1, -5, 4]
result = max_subarray(nums)
print(result)`,
          language: 'python',
          testCases: [
            { id: '1', input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6', isHidden: false, points: 15 },
            { id: '2', input: '[1]', expectedOutput: '1', isHidden: false, points: 10 },
            { id: '3', input: '[5, 4, -1, 7, 8]', expectedOutput: '23', isHidden: true, points: 15 },
            { id: '4', input: '[-1, -2, -3, -4]', expectedOutput: '-1', isHidden: true, points: 10 },
          ],
        },
        points: 50,
        difficulty: 'medium',
        tags: ['arrays', 'dynamic-programming'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Merge Sorted Arrays',
        type: 'coding',
        content: {
          prompt: `You are given two integer arrays nums1 and nums2, sorted in non-decreasing order.

Merge nums1 and nums2 into a single array sorted in non-decreasing order.

**Example:**
Input: nums1 = [1,2,3], nums2 = [2,5,6]
Output: [1,2,2,3,5,6]`,
          codeTemplate: `def merge_arrays(nums1, nums2):
    # Your code here
    pass

# Read input as JSON arrays
import json
nums1 = json.loads(input())  # e.g., [1, 2, 3]
nums2 = json.loads(input())  # e.g., [2, 5, 6]
result = merge_arrays(nums1, nums2)
print(json.dumps(result))`,
          language: 'python',
          testCases: [
            { id: '1', input: '[1, 2, 3]\n[2, 5, 6]', expectedOutput: '[1, 2, 2, 3, 5, 6]', isHidden: false, points: 15 },
            { id: '2', input: '[1]\n[1]', expectedOutput: '[1, 1]', isHidden: false, points: 10 },
            { id: '3', input: '[0]\n[1, 2, 3]', expectedOutput: '[0, 1, 2, 3]', isHidden: true, points: 10 },
            { id: '4', input: '[4, 5, 6]\n[1, 2, 3]', expectedOutput: '[1, 2, 3, 4, 5, 6]', isHidden: true, points: 15 },
          ],
        },
        points: 50,
        difficulty: 'medium',
        tags: ['arrays', 'sorting', 'two-pointers'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Binary Search',
        type: 'coding',
        content: {
          prompt: `Given a sorted array of integers and a target value, return the index if the target is found. If not, return -1.

You must write an algorithm with O(log n) runtime complexity.

**Example 1:**
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
Explanation: 9 exists in nums and its index is 4

**Example 2:**
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1
Explanation: 2 does not exist in nums so return -1`,
          codeTemplate: `def binary_search(nums, target):
    # Your code here - implement binary search
    pass

# Read input as JSON array and target
import json
nums = json.loads(input())  # e.g., [-1, 0, 3, 5, 9, 12]
target = int(input())       # e.g., 9
result = binary_search(nums, target)
print(result)`,
          language: 'python',
          testCases: [
            { id: '1', input: '[-1, 0, 3, 5, 9, 12]\n9', expectedOutput: '4', isHidden: false, points: 15 },
            { id: '2', input: '[-1, 0, 3, 5, 9, 12]\n2', expectedOutput: '-1', isHidden: false, points: 10 },
            { id: '3', input: '[1]\n1', expectedOutput: '0', isHidden: true, points: 10 },
            { id: '4', input: '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]\n7', expectedOutput: '6', isHidden: true, points: 15 },
          ],
        },
        points: 50,
        difficulty: 'medium',
        tags: ['arrays', 'binary-search'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Climbing Stairs',
        type: 'coding',
        content: {
          prompt: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**Example 1:**
Input: n = 2
Output: 2
Explanation: There are two ways to climb to the top.
1. 1 step + 1 step
2. 2 steps

**Example 2:**
Input: n = 3
Output: 3
Explanation: There are three ways to climb to the top.
1. 1 step + 1 step + 1 step
2. 1 step + 2 steps
3. 2 steps + 1 step`,
          codeTemplate: `def climb_stairs(n):
    # Your code here - use dynamic programming
    pass

# Read input
n = int(input())
result = climb_stairs(n)
print(result)`,
          language: 'python',
          testCases: [
            { id: '1', input: '2', expectedOutput: '2', isHidden: false, points: 15 },
            { id: '2', input: '3', expectedOutput: '3', isHidden: false, points: 15 },
            { id: '3', input: '5', expectedOutput: '8', isHidden: true, points: 10 },
            { id: '4', input: '10', expectedOutput: '89', isHidden: true, points: 10 },
          ],
        },
        points: 50,
        difficulty: 'medium',
        tags: ['dynamic-programming', 'math'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Longest Common Prefix',
        type: 'coding',
        content: {
          prompt: `Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return an empty string "".

**Example 1:**
Input: strs = ["flower","flow","flight"]
Output: "fl"

**Example 2:**
Input: strs = ["dog","racecar","car"]
Output: ""
Explanation: There is no common prefix among the input strings.`,
          codeTemplate: `def longest_common_prefix(strs):
    # Your code here
    pass

# Read input (comma-separated strings)
strs = input().split(',')
result = longest_common_prefix(strs)
print(result if result else 'NONE')`,
          language: 'python',
          testCases: [
            { id: '1', input: 'flower,flow,flight', expectedOutput: 'fl', isHidden: false, points: 20 },
            { id: '2', input: 'dog,racecar,car', expectedOutput: 'NONE', isHidden: false, points: 15 },
            { id: '3', input: 'a', expectedOutput: 'a', isHidden: true, points: 10 },
            { id: '4', input: 'interspecies,interstellar,interstate', expectedOutput: 'inters', isHidden: true, points: 15 },
          ],
        },
        points: 60,
        difficulty: 'hard',
        tags: ['strings'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
      {
        title: 'Valid Parentheses',
        type: 'coding',
        content: {
          prompt: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
Input: s = "()"
Output: True

**Example 2:**
Input: s = "()[]{}"
Output: True

**Example 3:**
Input: s = "(]"
Output: False`,
          codeTemplate: `def is_valid(s):
    # Your code here - use a stack
    pass

# Read input
s = input()
result = is_valid(s)
print(result)`,
          language: 'python',
          testCases: [
            { id: '1', input: '()', expectedOutput: 'True', isHidden: false, points: 15 },
            { id: '2', input: '()[]{}', expectedOutput: 'True', isHidden: false, points: 15 },
            { id: '3', input: '(]', expectedOutput: 'False', isHidden: false, points: 10 },
            { id: '4', input: '([{}])', expectedOutput: 'True', isHidden: true, points: 10 },
            { id: '5', input: '((()))', expectedOutput: 'True', isHidden: true, points: 10 },
          ],
        },
        points: 60,
        difficulty: 'hard',
        tags: ['strings', 'stack'],
        organizationId: organization._id,
        authorId: admin._id,
        status: 'published',
      },
    ]);

    logger.info(`Created ${questions.length} questions`);

    // Create Assessments
    const assessments = await Assessment.create([
      {
        title: 'JavaScript Fundamentals Quiz',
        description: 'Test your basic JavaScript knowledge',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Core Concepts',
            description: 'Test your understanding of JavaScript basics',
            questionIds: [questions[0]._id, questions[1]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 30,
          attemptsAllowed: 3,
          showResultsImmediately: true,
          allowReview: true,
          allowBackward: true,
          shuffleSections: false,
          proctoring: {
            enabled: false,
            requireIdCheck: false,
            detectTabSwitch: false,
            detectCopyPaste: false,
            enableWebcam: false,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 5,
            fullscreenRequired: false,
            allowCalculator: true,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: true,
            extraTimePercentage: 25,
            allowScreenReader: true,
            dyslexiaFriendlyFont: false,
          },
        },
        status: 'published',
        totalPoints: 20,
      },
      {
        title: 'Intermediate JavaScript Challenge',
        description: 'Challenge yourself with intermediate concepts',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Methods & Operators',
            questionIds: [questions[2]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
          {
            id: 'section2',
            title: 'Coding Problem',
            questionIds: [questions[3]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 45,
          attemptsAllowed: 2,
          showResultsImmediately: false,
          allowReview: true,
          allowBackward: true,
          shuffleSections: false,
          proctoring: {
            enabled: true,
            requireIdCheck: false,
            detectTabSwitch: true,
            detectCopyPaste: true,
            enableWebcam: false,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 5,
            fullscreenRequired: false,
            allowCalculator: false,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: false,
            allowScreenReader: false,
            dyslexiaFriendlyFont: false,
          },
        },
        status: 'published',
        totalPoints: 40,
      },
      {
        title: 'Advanced JavaScript Assessment',
        description: 'Test your advanced JavaScript knowledge',
        organizationId: organization._id,
        authorId: admin._id,
        sections: [
          {
            id: 'section1',
            title: 'Advanced Topics',
            questionIds: [questions[4]._id, questions[5]._id],
            randomizeQuestions: false,
            randomizeOptions: false,
          },
        ],
        settings: {
          totalTimeLimit: 60,
          attemptsAllowed: 1,
          showResultsImmediately: false,
          allowReview: false,
          allowBackward: false,
          shuffleSections: false,
          proctoring: {
            enabled: true,
            requireIdCheck: true,
            detectTabSwitch: true,
            detectCopyPaste: true,
            enableWebcam: true,
            enableScreenRecording: false,
            recordWebcam: false,
            recordScreen: false,
            takeSnapshots: false,
            snapshotIntervalMinutes: 10,
            fullscreenRequired: true,
            allowCalculator: false,
            allowScratchpad: true,
          },
          accessibility: {
            allowExtraTime: true,
            extraTimePercentage: 50,
            allowScreenReader: true,
            dyslexiaFriendlyFont: true,
          },
        },
        status: 'published',
        totalPoints: 35,
      },
    ]);

    logger.info(`Created ${assessments.length} assessments`);

    // Create Teams - 6 teams with 3 fellows each
    const teams = await Team.create([
      {
        name: 'Code Wizards',
        organizationId: organization._id,
        memberIds: [fellows[0]._id, fellows[1]._id, fellows[2]._id],
        description: 'Team Code Wizards',
        disqualified: false,
      },
      {
        name: 'Data Ninjas',
        organizationId: organization._id,
        memberIds: [fellows[3]._id, fellows[4]._id, fellows[5]._id],
        description: 'Team Data Ninjas',
        disqualified: false,
      },
      {
        name: 'Tech Titans',
        organizationId: organization._id,
        memberIds: [fellows[6]._id, fellows[7]._id, fellows[8]._id],
        description: 'Team Tech Titans',
        disqualified: false,
      },
      {
        name: 'Innovators',
        organizationId: organization._id,
        memberIds: [fellows[9]._id, fellows[10]._id, fellows[11]._id],
        description: 'Team Innovators',
        disqualified: false,
      },
      {
        name: 'Future Builders',
        organizationId: organization._id,
        memberIds: [fellows[12]._id, fellows[13]._id, fellows[14]._id],
        description: 'Team Future Builders',
        disqualified: false,
      },
      {
        name: 'Debug Squad',
        organizationId: organization._id,
        memberIds: [fellows[15]._id, fellows[16]._id, fellows[17]._id],
        description: 'Team Debug Squad',
        disqualified: false,
      },
    ]);

    logger.info(`Created ${teams.length} teams`);

    // Create Hackathon Session for December 13, 2025 (4 hours)
    // Filter for coding questions only
    const codingQuestions = questions.filter(q => q.type === 'coding');

    // Create hackathon session with coding problems
    const now = new Date();
    const hackathonSession = await HackathonSession.create({
      title: 'Justice Through Code - Hackathon Challenge',
      description: 'Live coding hackathon event - Currently Active',
      organizationId: organization._id,
      startTime: new Date(now.getTime() - 60 * 60 * 1000), // Started 1 hour ago
      endTime: new Date(now.getTime() + 3 * 60 * 60 * 1000), // Ends in 3 hours
      duration: 240, // 4 hours in minutes
      problems: codingQuestions.map((q, index) => ({
        problemId: q._id,
        title: q.title,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        points: q.points,
        order: index + 1,
      })),
      teams: teams.map(t => t._id),
      proctoring: {
        enabled: true,
        requireFullscreen: true,
        detectTabSwitch: true,
        detectCopyPaste: true,
        detectIdle: true,
        idleTimeoutMinutes: 10,
        allowCalculator: false,
        allowNotes: true,
        recordScreen: false,
        recordWebcam: false,
        takeSnapshots: false,
        snapshotIntervalMinutes: 10,
        requireIdentityCheck: false,
      },
      status: 'active',
      isActive: true,
      accommodations: [],
      createdBy: admin._id,
    });

    logger.info(`Created hackathon session: ${hackathonSession.title}`);

    logger.info('✅ Database seeding completed successfully!');

    return {
      organization,
      users: {
        admin,
        judges: [judge1, judge2, judge3],
        fellows,
      },
      questions,
      assessments,
      teams,
      hackathonSession,
    };
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}
