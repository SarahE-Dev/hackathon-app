import axios from 'axios';

const CODEWARS_API_BASE = 'https://www.codewars.com/api/v1';

export interface CodewarsProblem {
  id: string;
  name: string;
  slug: string;
  description: string;
  difficulty: number; // 1-8, where 1 is easiest
  languages: string[];
  tags: string[];
  totalAttempts: number;
  totalCompleted: number;
  createdAt: string;
  publishedAt: string;
  approvalStats: {
    totalVotes: number;
    positiveVotes: number;
    estimatedRank: number;
  };
  testCases?: string;
}

/**
 * Service to interact with Codewars API
 */
export const codewarsService = {
  /**
   * Get a problem by ID or slug from Codewars
   */
  getProblem: async (idOrSlug: string): Promise<CodewarsProblem> => {
    try {
      const response = await axios.get(
        `${CODEWARS_API_BASE}/code-challenges/${idOrSlug}`,
        {
          timeout: 5000,
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error(`Problem not found: ${idOrSlug}`);
      }
      throw new Error(`Codewars API error: ${error.message}`);
    }
  },

  /**
   * Search for problems by name (basic implementation)
   * Note: Codewars API doesn't support search, so this would need to be
   * implemented by fetching trending/featured problems or using scraping
   */
  searchProblems: async (query: string): Promise<CodewarsProblem[]> => {
    // Codewars API doesn't have a search endpoint
    // In production, you'd either:
    // 1. Scrape https://www.codewars.com/kata/search/{query}
    // 2. Maintain a cached list of problems
    // 3. Use a different service like LeetCode (with authentication)

    // For now, return empty array
    console.warn(`Codewars API search not available. Query: ${query}`);
    return [];
  },

  /**
   * Get trending/popular problems
   * Note: This endpoint doesn't exist in official API
   * Would need custom implementation or scraping
   */
  getTrendingProblems: async (): Promise<CodewarsProblem[]> => {
    // This would require scraping or maintaining a manual list
    console.warn('Codewars trending problems not available via API');
    return [];
  },

  /**
   * Check if Codewars API is accessible
   */
  checkAvailability: async (): Promise<boolean> => {
    try {
      // Try to fetch a known problem
      await axios.get(`${CODEWARS_API_BASE}/code-challenges/square-root-approximation`, {
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Convert difficulty rank (1-8) to user-friendly level
   * 1 = fundamentals, 8 = hard expert
   */
  difficultyToLevel: (rank: number): 'easy' | 'medium' | 'hard' => {
    if (rank <= 2) return 'easy';
    if (rank <= 5) return 'medium';
    return 'hard';
  },

  /**
   * Convert Codewars problem to CodeArena coding question format
   */
  convertToCodeArenaQuestion: (problem: CodewarsProblem, language: string = 'javascript') => {
    return {
      type: 'coding',
      title: problem.name,
      content: problem.description,
      language,
      difficulty: codewarsService.difficultyToLevel(problem.difficulty),
      points: 50 + (problem.difficulty * 10), // Scale points by difficulty
      tags: [...(problem.tags || []), `codewars-${problem.slug}`],
      externalLink: `https://www.codewars.com/kata/${problem.slug}`,
      metadata: {
        codewarsId: problem.id,
        codewarsDifficulty: problem.difficulty,
        codewarsStats: {
          totalAttempts: problem.totalAttempts,
          totalCompleted: problem.totalCompleted,
          successRate: problem.totalAttempts > 0
            ? ((problem.totalCompleted / problem.totalAttempts) * 100).toFixed(2) + '%'
            : 'N/A',
        },
      },
    };
  },
};

export default codewarsService;
