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
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  currentAnswer,
  onChange,
  readOnly = false,
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
          question={{
            content: {
              language: 'javascript',
              starterCode: '',
              testCases: [],
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
        />
      );

    default:
      return <div className="text-gray-400">Unknown question type: {question.type}</div>;
  }
};

export default QuestionRenderer;
