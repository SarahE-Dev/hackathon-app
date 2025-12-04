/**
 * PRODUCTION SEED
 * Creates only the essentials needed for a fresh production deployment:
 * - Organization (Justice Through Code)
 * - Coding problems/questions
 * - First admin user (you should change the password immediately!)
 * 
 * Does NOT create: demo users, teams, sessions (create via admin dashboard)
 */

import mongoose from 'mongoose';
import User from '../models/User';
import Organization from '../models/Organization';
import Question from '../models/Question';
import { logger } from '../utils/logger';

export async function seedProduction() {
  try {
    console.log('🚀 Starting PRODUCTION seed...');
    console.log('⚠️  This will CLEAR existing data and create fresh production setup.\n');

    // Clear existing data
    await User.deleteMany({});
    await Organization.deleteMany({});
    await Question.deleteMany({});

    logger.info('Cleared existing data');

    // Create Organization
    const organization = await Organization.create({
      name: 'Justice Through Code',
      slug: 'justice-through-code',
      settings: {
        allowSelfRegistration: true,
        requireEmailVerification: false,
        defaultRole: 'fellow',
        sessionDefaults: {
          duration: 120,
          allowLateSubmission: false,
          showResults: true,
        },
      },
    });

    logger.info(`Created organization: ${organization.name}`);

    // Create first admin user - CHANGE THIS PASSWORD IMMEDIATELY!
    const admin = await User.create({
      email: 'admin@justicethroughcode.org',
      password: 'ChangeMe123!',
      firstName: 'JTC',
      lastName: 'Admin',
      roles: [{ role: 'admin', organizationId: organization._id }],
      isActive: true,
      emailVerified: true,
    });

    logger.info(`Created admin user: ${admin.email}`);
    console.log('\n⚠️  IMPORTANT: Change the admin password immediately after first login!');
    console.log('   Email: admin@justicethroughcode.org');
    console.log('   Password: ChangeMe123!\n');

    // Create coding problems
    const codingProblems = [
      {
        title: 'Two Sum',
        type: 'coding',
        difficulty: 'easy',
        points: 100,
        content: {
          prompt: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Example 1:**
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].

**Example 2:**
Input: nums = [3,2,4], target = 6
Output: [1,2]

**Example 3:**
Input: nums = [3,3], target = 6
Output: [0,1]`,
          starterCode: `def two_sum(nums, target):
    # Your code here
    pass

# Read input
nums = list(map(int, input().split()))
target = int(input())
result = two_sum(nums, target)
print(result)`,
          testCases: [
            { input: '2 7 11 15\n9', expectedOutput: '[0, 1]', isHidden: false },
            { input: '3 2 4\n6', expectedOutput: '[1, 2]', isHidden: false },
            { input: '3 3\n6', expectedOutput: '[0, 1]', isHidden: true },
            { input: '1 5 3 7 2\n9', expectedOutput: '[1, 3]', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['array', 'hash-table'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Reverse String',
        type: 'coding',
        difficulty: 'easy',
        points: 100,
        content: {
          prompt: `Write a function that reverses a string. The input string is given as an array of characters.

You must do this by modifying the input array in-place with O(1) extra memory.

**Example 1:**
Input: ["h","e","l","l","o"]
Output: ["o","l","l","e","h"]

**Example 2:**
Input: ["H","a","n","n","a","h"]
Output: ["h","a","n","n","a","H"]`,
          starterCode: `def reverse_string(s):
    # Your code here - modify s in-place
    pass

# Read input
s = input().split()
reverse_string(s)
print(s)`,
          testCases: [
            { input: 'h e l l o', expectedOutput: "['o', 'l', 'l', 'e', 'h']", isHidden: false },
            { input: 'H a n n a h', expectedOutput: "['h', 'a', 'n', 'n', 'a', 'H']", isHidden: false },
            { input: 'a', expectedOutput: "['a']", isHidden: true },
            { input: 'A B', expectedOutput: "['B', 'A']", isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['string', 'two-pointers'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'FizzBuzz',
        type: 'coding',
        difficulty: 'easy',
        points: 100,
        content: {
          prompt: `Write a program that outputs numbers from 1 to n. But for multiples of 3 print "Fizz" instead of the number and for multiples of 5 print "Buzz". For numbers which are multiples of both 3 and 5 print "FizzBuzz".

**Example:**
Input: n = 15
Output:
1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz`,
          starterCode: `def fizzbuzz(n):
    # Your code here
    pass

n = int(input())
fizzbuzz(n)`,
          testCases: [
            { input: '5', expectedOutput: '1\n2\nFizz\n4\nBuzz', isHidden: false },
            { input: '15', expectedOutput: '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz', isHidden: false },
            { input: '3', expectedOutput: '1\n2\nFizz', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['math', 'string'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Valid Parentheses',
        type: 'coding',
        difficulty: 'medium',
        points: 150,
        content: {
          prompt: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

**Example 1:**
Input: s = "()"
Output: true

**Example 2:**
Input: s = "()[]{}"
Output: true

**Example 3:**
Input: s = "(]"
Output: false`,
          starterCode: `def is_valid(s):
    # Your code here
    pass

s = input()
print(is_valid(s))`,
          testCases: [
            { input: '()', expectedOutput: 'True', isHidden: false },
            { input: '()[]{}', expectedOutput: 'True', isHidden: false },
            { input: '(]', expectedOutput: 'False', isHidden: false },
            { input: '([)]', expectedOutput: 'False', isHidden: true },
            { input: '{[]}', expectedOutput: 'True', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['string', 'stack'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Maximum Subarray',
        type: 'coding',
        difficulty: 'medium',
        points: 150,
        content: {
          prompt: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

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
          starterCode: `def max_subarray(nums):
    # Your code here
    pass

nums = list(map(int, input().split()))
print(max_subarray(nums))`,
          testCases: [
            { input: '-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false },
            { input: '1', expectedOutput: '1', isHidden: false },
            { input: '5 4 -1 7 8', expectedOutput: '23', isHidden: false },
            { input: '-1 -2 -3', expectedOutput: '-1', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['array', 'dynamic-programming'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Merge Sorted Arrays',
        type: 'coding',
        difficulty: 'medium',
        points: 150,
        content: {
          prompt: `You are given two integer arrays nums1 and nums2, sorted in non-decreasing order. Merge nums2 into nums1 as one sorted array and return it.

**Example 1:**
Input: nums1 = [1,2,3], nums2 = [2,5,6]
Output: [1,2,2,3,5,6]

**Example 2:**
Input: nums1 = [1], nums2 = []
Output: [1]`,
          starterCode: `def merge_sorted(nums1, nums2):
    # Your code here
    pass

nums1 = list(map(int, input().split())) if input().strip() else []
nums2 = list(map(int, input().split())) if input().strip() else []
print(merge_sorted(nums1, nums2))`,
          testCases: [
            { input: '1 2 3\n2 5 6', expectedOutput: '[1, 2, 2, 3, 5, 6]', isHidden: false },
            { input: '1\n', expectedOutput: '[1]', isHidden: false },
            { input: '\n1', expectedOutput: '[1]', isHidden: true },
            { input: '1 3 5\n2 4 6', expectedOutput: '[1, 2, 3, 4, 5, 6]', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['array', 'two-pointers', 'sorting'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Binary Search',
        type: 'coding',
        difficulty: 'easy',
        points: 100,
        content: {
          prompt: `Given a sorted array of integers nums and a target value, return the index of target if it is in nums. If not, return -1.

You must write an algorithm with O(log n) runtime complexity.

**Example 1:**
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4

**Example 2:**
Input: nums = [-1,0,3,5,9,12], target = 2
Output: -1`,
          starterCode: `def binary_search(nums, target):
    # Your code here
    pass

nums = list(map(int, input().split()))
target = int(input())
print(binary_search(nums, target))`,
          testCases: [
            { input: '-1 0 3 5 9 12\n9', expectedOutput: '4', isHidden: false },
            { input: '-1 0 3 5 9 12\n2', expectedOutput: '-1', isHidden: false },
            { input: '1 2 3 4 5\n1', expectedOutput: '0', isHidden: true },
            { input: '1 2 3 4 5\n5', expectedOutput: '4', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['array', 'binary-search'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
      {
        title: 'Longest Common Prefix',
        type: 'coding',
        difficulty: 'easy',
        points: 100,
        content: {
          prompt: `Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return "NONE".

**Example 1:**
Input: strs = ["flower","flow","flight"]
Output: "fl"

**Example 2:**
Input: strs = ["dog","racecar","car"]
Output: "NONE"
Explanation: There is no common prefix among the input strings.`,
          starterCode: `def longest_common_prefix(strs):
    # Your code here
    # Return "NONE" if no common prefix
    pass

strs = input().split()
result = longest_common_prefix(strs)
print(result if result else "NONE")`,
          testCases: [
            { input: 'flower flow flight', expectedOutput: 'fl', isHidden: false },
            { input: 'dog racecar car', expectedOutput: 'NONE', isHidden: false },
            { input: 'a', expectedOutput: 'a', isHidden: true },
            { input: 'abc abc abc', expectedOutput: 'abc', isHidden: true },
          ],
          language: 'python',
          timeLimit: 5000,
          memoryLimit: 256,
        },
        tags: ['string'],
        organizationId: organization._id,
        createdBy: admin._id,
      },
    ];

    const questions = await Question.insertMany(codingProblems);
    logger.info(`Created ${questions.length} coding problems`);

    console.log('\n✅ PRODUCTION SEED COMPLETE!\n');
    console.log('Created:');
    console.log(`  - Organization: ${organization.name}`);
    console.log(`  - Admin user: ${admin.email}`);
    console.log(`  - ${questions.length} coding problems`);
    console.log('\nNext steps:');
    console.log('  1. Login as admin and change password');
    console.log('  2. Add judges via Admin Dashboard → User Management');
    console.log('  3. Pre-register fellows via Admin Dashboard → User Management');
    console.log('  4. Create teams via Admin Dashboard → Teams');
    console.log('  5. Create a hackathon session and assign teams/problems');

    return { organization, admin, questions };
  } catch (error) {
    logger.error('Error in production seed:', error);
    throw error;
  }
}

// Run if called directly
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hackathon-platform';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    return seedProduction();
  })
  .then(() => {
    console.log('\nDatabase seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });

