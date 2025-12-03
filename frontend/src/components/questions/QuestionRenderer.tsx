'use client';

import React from 'react';
import MultipleChoiceQuestion from './MultipleChoiceQuestion';
import MultiSelectQuestion from './MultiSelectQuestion';
import ShortAnswerQuestion from './ShortAnswerQuestion';
import LongAnswerQuestion from './LongAnswerQuestion';
import CodingQuestion from './CodingQuestion';
import FileUploadQuestion from './FileUploadQuestion';

export interface IQuestion {
  id: string;
  type: 'MCQ' | 'Multi-Select' | 'Short-Answer' | 'Long-Answer' | 'Coding' | 'File-Upload';
  title: string;
  content: string;
  options?: string[];
  correctAnswer?: string | string[];
  testCases?: Array<{ input: string; output: string; hidden: boolean }>;
  rubricId?: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
}

interface QuestionRendererProps {
  question: IQuestion;
  currentAnswer?: any;
  onChange: (answer: any) => void;
  readOnly?: boolean;
  attemptId?: string;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  currentAnswer,
  onChange,
  readOnly = false,
  attemptId,
}) => {
  switch (question.type) {
    case 'MCQ':
      return (
        <MultipleChoiceQuestion
          question={question}
          currentAnswer={currentAnswer}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case 'Multi-Select':
      return (
        <MultiSelectQuestion
          question={question}
          currentAnswer={currentAnswer}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case 'Short-Answer':
      return (
        <ShortAnswerQuestion
          question={question}
          currentAnswer={currentAnswer}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case 'Long-Answer':
      return (
        <LongAnswerQuestion
          question={question}
          currentAnswer={currentAnswer}
          onChange={onChange}
          readOnly={readOnly}
        />
      );

    case 'Coding':
      return (
        <CodingQuestion
          key={question.id} // Force re-render when question changes
          question={{
            id: question.id,
            title: question.title,
            prompt: (question as any).content?.prompt || (question as any).prompt || question.content || '',
            content: {
              language: (question as any).content?.language || (question as any).language || 'python',
              starterCode: (question as any).content?.codeTemplate || (question as any).codeTemplate || '',
              testCases: (question as any).content?.testCases || (question as any).testCases || [],
            },
          }}
          value={currentAnswer}
          onChange={onChange}
          disabled={readOnly}
        />
      );

    case 'File-Upload':
      return (
        <FileUploadQuestion
          question={{
            content: {
              allowedFileTypes: ['.pdf', '.doc', '.docx', '.txt', '.zip', '.jpg', '.png'],
              maxFileSize: 10,
              maxFiles: 5,
            },
          }}
          value={currentAnswer}
          onChange={onChange}
          disabled={readOnly}
          questionId={question.id}
          attemptId={attemptId}
        />
      );

    default:
      return <div className="text-gray-400">Unknown question type: {question.type}</div>;
  }
};

export default QuestionRenderer;
