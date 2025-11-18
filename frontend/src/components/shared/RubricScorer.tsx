'use client';

import React, { useState, useEffect } from 'react';

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  maxScore: number;
  levels: {
    score: number;
    label: string;
    description: string;
  }[];
}

interface RubricScorerProps {
  criteria: RubricCriterion[];
  onScoreChange: (scores: Record<string, number>) => void;
  initialScores?: Record<string, number>;
  readOnly?: boolean;
}

export default function RubricScorer({
  criteria,
  onScoreChange,
  initialScores = {},
  readOnly = false,
}: RubricScorerProps) {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);

  useEffect(() => {
    onScoreChange(scores);
  }, [scores]);

  const handleScoreChange = (criterionId: string, score: number) => {
    if (readOnly) return;
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const maxPossibleScore = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const percentageScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-400';
    if (percentage >= 80) return 'text-neon-blue';
    if (percentage >= 70) return 'text-yellow-400';
    if (percentage >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Total Score Display */}
      <div className="glass rounded-xl p-6 border-2 border-neon-purple/30">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Total Score</h3>
          <div className={`text-4xl font-bold ${getScoreColor(percentageScore)}`}>
            {totalScore}/{maxPossibleScore}
          </div>
        </div>
        <div className="w-full bg-dark-700 rounded-full h-3">
          <div
            className="h-3 rounded-full bg-gradient-to-r from-neon-blue to-neon-purple transition-all"
            style={{ width: `${percentageScore}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
          <span>Progress</span>
          <span>{percentageScore.toFixed(1)}%</span>
        </div>
      </div>

      {/* Rubric Criteria */}
      <div className="space-y-4">
        {criteria.map((criterion) => {
          const currentScore = scores[criterion.id] || 0;
          const isSelected = selectedCriterion === criterion.id;

          return (
            <div
              key={criterion.id}
              className={`glass rounded-xl border-2 transition-all ${
                isSelected ? 'border-neon-blue' : 'border-gray-700'
              }`}
            >
              {/* Criterion Header */}
              <button
                onClick={() => setSelectedCriterion(isSelected ? null : criterion.id)}
                className="w-full p-6 text-left hover:bg-dark-700/50 transition-colors rounded-t-xl"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold mb-1">{criterion.name}</h4>
                    <p className="text-sm text-gray-400">{criterion.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-2xl font-bold ${currentScore > 0 ? 'text-neon-purple' : 'text-gray-500'}`}>
                      {currentScore}/{criterion.maxScore}
                    </div>
                  </div>
                </div>

                {/* Score Slider */}
                {!readOnly && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="range"
                      min="0"
                      max={criterion.maxScore}
                      step="0.5"
                      value={currentScore}
                      onChange={(e) => handleScoreChange(criterion.id, parseFloat(e.target.value))}
                      className="w-full h-2 bg-dark-600 rounded-lg appearance-none cursor-pointer slider"
                    />
                  </div>
                )}
              </button>

              {/* Expanded View - Score Levels */}
              {isSelected && criterion.levels && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-700">
                  <h5 className="text-sm font-semibold text-gray-400 mb-3">Scoring Guide:</h5>
                  <div className="space-y-2">
                    {criterion.levels.map((level) => (
                      <button
                        key={level.score}
                        onClick={() => handleScoreChange(criterion.id, level.score)}
                        disabled={readOnly}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          currentScore === level.score
                            ? 'bg-neon-purple/20 border-2 border-neon-purple'
                            : 'bg-dark-700 border-2 border-transparent hover:border-gray-600'
                        } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <span className="font-semibold">{level.label}</span>
                          <span className="text-neon-purple font-bold">{level.score} pts</span>
                        </div>
                        <p className="text-sm text-gray-400">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid #0ff;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }

        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background: #a855f7;
          cursor: pointer;
          border-radius: 50%;
          border: 2px solid #0ff;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </div>
  );
}
