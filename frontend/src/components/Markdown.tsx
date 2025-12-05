'use client';

import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  content: string;
  className?: string;
}

export default function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        components={{
          // Headers
          h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold text-white mb-3 mt-4">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold text-white mb-2 mt-3">{children}</h3>,
          
          // Paragraphs
          p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
          
          // Bold and emphasis
          strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
          em: ({ children }) => <em className="text-gray-200 italic">{children}</em>,
          
          // Code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-dark-700 text-neon-green px-1.5 py-0.5 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className={`${className} block bg-dark-800 p-3 rounded-lg overflow-x-auto font-mono text-sm`} {...props}>
                {children}
              </code>
            );
          },
          
          // Pre (code blocks)
          pre: ({ children }) => (
            <pre className="bg-dark-800 rounded-lg p-4 overflow-x-auto my-3 border border-gray-700">
              {children}
            </pre>
          ),
          
          // Lists
          ul: ({ children }) => <ul className="list-disc list-inside text-gray-300 mb-3 space-y-1 ml-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside text-gray-300 mb-3 space-y-1 ml-2">{children}</ol>,
          li: ({ children }) => <li className="text-gray-300">{children}</li>,
          
          // Links
          a: ({ href, children }) => (
            <a href={href} className="text-neon-blue hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-neon-purple pl-4 my-3 text-gray-400 italic">
              {children}
            </blockquote>
          ),
          
          // Horizontal rule
          hr: () => <hr className="border-gray-700 my-4" />,
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border border-gray-700 rounded-lg">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-dark-700">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-gray-700">{children}</tbody>,
          tr: ({ children }) => <tr>{children}</tr>,
          th: ({ children }) => <th className="px-4 py-2 text-left text-sm font-semibold text-white">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 text-sm text-gray-300">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

