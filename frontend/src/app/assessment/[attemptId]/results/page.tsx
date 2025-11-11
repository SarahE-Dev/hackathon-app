'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { QuestionRenderer, IQuestion } from '@/components/questions/QuestionRenderer';
import axios from 'axios';

// Utility function to convert data to CSV
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(','));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes in CSV
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}

// Function to download CSV file
function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Map backend question types to QuestionRenderer types
const mapQuestionType = (backendType: string): 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload' => {
  switch (backendType) {
    case 'multiple-choice': return 'MCQ';
    case 'multi-select': return 'Multi-Select';
    case 'short-answer': return 'Short-Answer';
    case 'long-answer': return 'Long-Answer';
    case 'coding': return 'Coding';
    case 'file-upload': return 'File-Upload';
    default: return 'Short-Answer'; // Default fallback
  }
};

interface Answer {
  questionId: string;
  answer: any;
  timestamp: Date;
  timeSpent: number;
}

interface Question extends IQuestion {
  _id: string;
  points: number;
  description?: string; // Backend field mapping
}

interface Attempt {
  _id: string;
  assessmentId: string;
  assessmentSnapshot: {
    title: string;
    description: string;
    questions: Question[];
    settings: any;
  };
  startedAt: string;
  submittedAt?: string;
  answers: Answer[];
  status: 'in-progress' | 'submitted' | 'graded';
  score?: number;
}

interface Grade {
  _id: string;
  attemptId: string;
  questionId: string;
  score: number;
  maxScore: number;
  feedback?: string;
  gradedBy?: string;
  gradedAt?: string;
}

export default function AssessmentResultsPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);

      // Load attempt data
      const token = localStorage.getItem('accessToken');
      const attemptResponse = await axios.get(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/attempts/${attemptId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const attemptData = attemptResponse.data.data.attempt;
      setAttempt(attemptData);

      // Load grades if available
      try {
        const gradesResponse = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/grades/attempt/${attemptId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const gradesData = gradesResponse.data.data || [];
        const gradesMap: Record<string, Grade> = {};
        gradesData.forEach((grade: Grade) => {
          gradesMap[grade.questionId] = grade;
        });
        setGrades(gradesMap);
      } catch (gradesErr) {
        // Grades might not be available yet
        console.log('Grades not available:', gradesErr);
        setGrades({});
      }

    } catch (err: any) {
      console.error('Error loading results:', err);
      setError(err.response?.data?.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const getQuestionScore = (questionId: string) => {
    const grade = grades[questionId];
    return grade ? grade.score : 0;
  };

  const getQuestionMaxScore = (questionId: string) => {
    const grade = grades[questionId];
    return grade ? grade.maxScore : 0;
  };

  const getQuestionFeedback = (questionId: string) => {
    const grade = grades[questionId];
    return grade?.feedback;
  };

  const getTotalScore = () => {
    if (attempt?.score !== undefined) return attempt.score;
    return attempt?.assessmentSnapshot.questions.reduce((total, question) => {
      return total + getQuestionScore(question._id);
    }, 0) || 0;
  };

  const getTotalMaxScore = () => {
    return attempt?.assessmentSnapshot.questions.reduce((total, question) => {
      return total + (getQuestionMaxScore(question._id) || question.points);
    }, 0) || 0;
  };

  const getScorePercentage = () => {
    const total = getTotalMaxScore();
    return total > 0 ? Math.round((getTotalScore() / total) * 100) : 0;
  };

  const exportToCSV = () => {
    if (!attempt) return;

    const exportData = attempt.assessmentSnapshot.questions.map((question, index) => {
      const userAnswer = attempt.answers.find(a => a.questionId === question._id);
      const grade = grades[question._id];

      return {
        'Question #': index + 1,
        'Question Type': question.type,
        'Question Title': question.title,
        'Points Possible': question.points,
        'Points Earned': grade ? grade.score : 0,
        'Your Answer': userAnswer ? JSON.stringify(userAnswer.answer) : 'No answer',
        'Feedback': grade?.feedback || 'No feedback provided',
        'Graded By': grade?.gradedBy || 'Not graded',
        'Graded At': grade?.gradedAt ? new Date(grade.gradedAt).toLocaleString() : 'Not graded'
      };
    });

    const headers = [
      'Question #', 'Question Type', 'Question Title', 'Points Possible',
      'Points Earned', 'Your Answer', 'Feedback', 'Graded By', 'Graded At'
    ];
    const csvContent = convertToCSV(exportData, headers);

    const filename = `${attempt.assessmentSnapshot.title}_Detailed_Results_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-neon-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Assessment results not found</p>
          <Link href="/dashboard" className="text-neon-blue hover:text-neon-blue/80 mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const totalScore = getTotalScore();
  const totalMaxScore = getTotalMaxScore();
  const scorePercentage = getScorePercentage();

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <header className="glass border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-neon-blue hover:text-neon-blue/80 transition-all mb-2 inline-block"
              >
                ← Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gradient">{attempt.assessmentSnapshot.title}</h1>
              <p className="text-gray-400 mt-1">Assessment Results</p>
            </div>
            <div className="text-right flex items-center gap-4">
              <div>
                <div className="text-3xl font-bold text-neon-blue">{scorePercentage}%</div>
                <div className="text-sm text-gray-400">
                  {totalScore} / {totalMaxScore} points
                </div>
              </div>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-neon-blue hover:bg-neon-blue/80 text-white rounded-lg text-sm transition-all"
              >
                📊 Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Score Card */}
        <div className="mb-8">
          <div className="glass rounded-2xl p-8 border border-gray-800">
            <div className="text-center">
              <div className="text-6xl font-bold text-gradient mb-4">{scorePercentage}%</div>
              <h2 className="text-2xl font-bold mb-2">Assessment Complete</h2>
              <p className="text-gray-400 mb-6">
                You scored {totalScore} out of {totalMaxScore} points
              </p>

              <div className="flex justify-center gap-8 text-sm text-gray-400">
                <div>
                  <div className="font-semibold text-white">Started</div>
                  <div>{new Date(attempt.startedAt).toLocaleString()}</div>
                </div>
                {attempt.submittedAt && (
                  <div>
                    <div className="font-semibold text-white">Submitted</div>
                    <div>{new Date(attempt.submittedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question-by-Question Results */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold">Question Details</h2>

          {attempt.assessmentSnapshot.questions.map((question, index) => {
            const userAnswer = attempt.answers.find(a => a.questionId === question._id);
            const grade = grades[question._id];
            const questionScore = getQuestionScore(question._id);
            const questionMaxScore = getQuestionMaxScore(question._id) || question.points;
            const feedback = getQuestionFeedback(question._id);

            return (
              <div
                key={question._id}
                className="glass rounded-xl p-6 border border-gray-800"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-neon-blue">Q{index + 1}</span>
                      <span className="px-2 py-1 bg-gray-700 rounded text-xs capitalize">
                        {question.type.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-gray-400">
                        {questionScore}/{questionMaxScore} points
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{question.title}</h3>
                    {question.description && (
                      <p className="text-gray-400 text-sm mb-4">{question.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      questionScore === questionMaxScore ? 'text-neon-green' :
                      questionScore > 0 ? 'text-neon-yellow' : 'text-red-400'
                    }`}>
                      {questionScore}/{questionMaxScore}
                    </div>
                  </div>
                </div>

                {/* Your Answer */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Your Answer:</h4>
                  <div className="bg-dark-800 rounded-lg p-4 border border-gray-700">
                    {userAnswer ? (
                      <QuestionRenderer
                        question={{
                          ...question,
                          id: question._id,
                          type: mapQuestionType(question.type), // Map backend type to renderer type
                        }}
                        currentAnswer={userAnswer.answer}
                        onChange={() => {}}
                        readOnly={true}
                      />
                    ) : (
                      <p className="text-gray-500 italic">No answer provided</p>
                    )}
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-neon-blue mb-2">Feedback:</h4>
                    <div className="bg-neon-blue/10 rounded-lg p-4 border border-neon-blue/20">
                      <p className="text-gray-300">{feedback}</p>
                    </div>
                  </div>
                )}

                {/* Graded By */}
                {grade?.gradedBy && (
                  <div className="text-xs text-gray-500 text-right">
                    Graded by {grade.gradedBy}
                    {grade.gradedAt && ` on ${new Date(grade.gradedAt).toLocaleDateString()}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-12 text-center">
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-gradient-to-r from-neon-blue to-neon-purple text-white font-semibold rounded-lg hover:opacity-90 transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
