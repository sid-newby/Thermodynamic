<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Claude's Markdown Theme</title>
  <style>
    body {
      background: #000;
      color: #e5e7eb;
      font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .code-block {
      background: #0a0a0a;
      border: 1px solid #1a1a1a;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      overflow-x: auto;
    }
    .code-block pre {
      margin: 0;
      color: #e5e7eb;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 0.9rem;
      line-height: 1.5;
    }
    h2 {
      font-family: 'Poppins', sans-serif;
      font-weight: 800;
      background: linear-gradient(90deg, #fff 0%, #00b6dd 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 2rem 0 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>React Components (app.tsx)</h2>
    <div class="code-block">
      <pre>// First, install required packages:
// npm install react-markdown remark-gfm react-syntax-highlighter @types/react-syntax-highlighter

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import mermaid from 'mermaid';
import { useEffect, useRef } from 'react';

// Initialize mermaid
mermaid.initialize({ 
  theme: 'dark',
  themeVariables: {
    primaryColor: '#00b6dd',
    primaryTextColor: '#fff',
    primaryBorderColor: '#00b6dd',
    lineColor: '#5e5e5e',
    secondaryColor: '#006db3',
    tertiaryColor: '#1a1a1a',
    background: '#0a0a0a',
    mainBkg: '#0a0a0a',
    secondBkg: '#111',
    tertiaryBkg: '#1a1a1a'
  }
});

const mdComponents = {
  h1: ({children, ...props}) => (
    &lt;h1 className="md-h1" {...props}&gt;
      {typeof children === 'string' ? children.toLowerCase() : children}
    &lt;/h1&gt;
  ),
  h2: ({children, ...props}) => (
    &lt;h2 className="md-h2" {...props}&gt;
      {typeof children === 'string' ? children.toLowerCase() : children}
    &lt;/h2&gt;
  ),
  h3: ({children, ...props}) => (
    &lt;h3 className="md-h3" {...props}&gt;
      {typeof children === 'string' ? children.toLowerCase() : children}
    &lt;/h3&gt;
  ),
  h4: (props) => &lt;h4 className="md-h4" {...props} /&gt;,
  h5: (props) => &lt;h5 className="md-h5" {...props} /&gt;,
  h6: (props) => &lt;h6 className="md-h6" {...props} /&gt;,
  p: (props) => &lt;p className="md-p" {...props} /&gt;,
  a: (props) => &lt;a className="md-link" {...props} /&gt;,
  ul: (props) => &lt;ul className="md-ul" {...props} /&gt;,
  ol: (props) => &lt;ol className="md-ol" {...props} /&gt;,
  li: (props) => &lt;li className="md-li" {...props} /&gt;,
  blockquote: (props) => &lt;blockquote className="md-quote" {...props} /&gt;,
  hr: () => &lt;hr className="md-hr" /&gt;,
  table: (props) => (
    &lt;div className="md-table-wrapper"&gt;
      &lt;table className="md-table" {...props} /&gt;
    &lt;/div&gt;
  ),
  thead: (props) => &lt;thead className="md-thead" {...props} /&gt;,
  tbody: (props) => &lt;tbody className="md-tbody" {...props} /&gt;,
  tr: (props) => &lt;tr className="md-tr" {...props} /&gt;,
  th: (props) => &lt;th className="md-th" {...props} /&gt;,
  td: (props) => &lt;td className="md-td" {...props} /&gt;,
  em: (props) => &lt;em className="md-em" {...props} /&gt;,
  strong: (props) => &lt;strong className="md-strong" {...props} /&gt;,
  del: (props) => &lt;del className="md-del" {...props} /&gt;,
  
  // Code blocks with syntax highlighting
  code: ({inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');
    
    // Handle mermaid diagrams
    if (match && match[1] === 'mermaid') {
      return &lt;MermaidDiagram chart={codeString} /&gt;;
    }
    
    return !inline && match ? (
      &lt;div className="md-code-block-wrapper"&gt;
        &lt;div className="md-code-header"&gt;
          &lt;span className="md-code-lang"&gt;{match[1]}&lt;/span&gt;
          &lt;button 
            className="md-code-copy"
            onClick={() => navigator.clipboard.writeText(codeString)}
          &gt;
            copy
          &lt;/button&gt;
        &lt;/div&gt;
        &lt;SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          customStyle={{
            margin: 0,
            background: '#0a0e1a',
            fontSize: '0.9rem',
            borderRadius: '0 0 12px 12px',
          }}
          {...props}
        &gt;
          {codeString}
        &lt;/SyntaxHighlighter&gt;
      &lt;/div&gt;
    ) : (
      &lt;code className={inline ? "md-code-inline" : "md-code"} {...props}&gt;
        {children}
      &lt;/code&gt;
    );
  },
};

// Mermaid component
const MermaidDiagram = ({ chart }) => {
  const ref = useRef(null);
  
  useEffect(() => {
    if (ref.current) {
      mermaid.render('mermaid-' + Math.random(), chart).then(({svg}) => {
        ref.current.innerHTML = svg;
      });
    }
  }, [chart]);
  
  return &lt;div className="md-mermaid" ref={ref} /&gt;;
};

// Usage in your component
&lt;ReactMarkdown 
  remarkPlugins={[remarkGfm, remarkMath]} 
  rehypePlugins={[rehypeKatex]}
  components={mdComponents}
&gt;
  {markdown}
&lt;/ReactMarkdown&gt;</pre>
    </div>

    <h2>CSS Styles (claude-theme.css)</h2>
    <div class="code-block">
      <pre>/* Import fonts */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@800&family=Geist:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

/* Headers with tight letter spacing and gradient */
.md-h1, .md-h2, .md-h3 {
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
  letter-spacing: -0.05em; /* Irresponsibly close */
  background: linear-gradient(90deg, #ffffff 0%, #00b6dd 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-transform: lowercase;
  line-height: 1.1;
  position: relative;
  transition: all 0.3s ease;
}

.md-h1 {
  font-size: 3rem;
  margin: 2rem 0 1rem;
  padding-bottom: 0.5rem;
}

.md-h1::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, #00b6dd 0%, transparent 100%);
}

.md-h2 {
  font-size: 2.25rem;
  margin: 1.75rem 0 0.75rem;
}

.md-h3 {
  font-size: 1.75rem;
  margin: 1.5rem 0 0.75rem;
}

.md-h4, .md-h5, .md-h6 {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 600;
  color: #e5e7eb;
  margin: 1.25rem 0 0.5rem;
}

.md-h4 { font-size: 1.25rem; }
.md-h5 { font-size: 1.125rem; }
.md-h6 { font-size: 1rem; }

/* Paragraphs with Geist font */
.md-p {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 1rem;
  line-height: 1.7;
  color: #d1d5db;
  margin: 0.75rem 0;
  font-weight: 400;
}

/* Strong emphasis with proper bolding */
.md-strong {
  font-weight: 600;
  color: #f3f4f6;
  background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.md-em {
  font-style: italic;
  color: #9ca3af;
}

.md-del {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Links with hover effects */
.md-link {
  color: #00b6dd;
  text-decoration: none;
  position: relative;
  transition: color 0.3s ease;
  font-weight: 500;
}

.md-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background: #00b6dd;
  transition: width 0.3s ease;
}

.md-link:hover {
  color: #00d4ff;
}

.md-link:hover::after {
  width: 100%;
}

/* Inline code */
.md-code-inline {
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.875em;
  padding: 0.125rem 0.375rem;
  background: linear-gradient(135deg, #1a1f2e 0%, #0f1419 100%);
  border: 1px solid #2a3441;
  border-radius: 6px;
  color: #00d4ff;
  font-weight: 500;
  white-space: nowrap;
}

/* Code blocks with header */
.md-code-block-wrapper {
  margin: 1.5rem 0;
  border-radius: 12px;
  overflow: hidden;
  background: #0a0e1a;
  border: 1px solid #1f2937;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);
}

.md-code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: linear-gradient(90deg, #111827 0%, #0f172a 100%);
  border-bottom: 1px solid #1f2937;
}

.md-code-lang {
  font-family: 'Geist', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: #00b6dd;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.md-code-copy {
  font-family: 'Geist', sans-serif;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  background: transparent;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: lowercase;
}

.md-code-copy:hover {
  background: #1f2937;
  border-color: #00b6dd;
  color: #00b6dd;
}

/* Lists with custom bullets */
.md-ul, .md-ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
  color: #d1d5db;
}

.md-ul {
  list-style: none;
  padding-left: 1.25rem;
}

.md-ul .md-li {
  position: relative;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.md-ul .md-li::before {
  content: '▸';
  position: absolute;
  left: 0;
  color: #00b6dd;
  font-weight: bold;
}

.md-ol {
  counter-reset: item;
  list-style: none;
}

.md-ol .md-li {
  counter-increment: item;
  position: relative;
  padding-left: 2rem;
  margin: 0.5rem 0;
}

.md-ol .md-li::before {
  content: counter(item);
  position: absolute;
  left: 0;
  top: 0;
  background: linear-gradient(135deg, #00b6dd 0%, #0891b2 100%);
  color: #000;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
}

/* Blockquotes */
.md-quote {
  position: relative;
  margin: 1.5rem 0;
  padding: 1.25rem 1.5rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border-left: 3px solid #00b6dd;
  border-radius: 8px;
  color: #cbd5e1;
  font-style: italic;
  overflow: hidden;
}

.md-quote::before {
  content: '"';
  position: absolute;
  top: -10px;
  left: 10px;
  font-size: 4rem;
  color: #00b6dd;
  opacity: 0.2;
  font-family: 'Poppins', sans-serif;
  font-weight: 800;
}

/* Horizontal rule */
.md-hr {
  margin: 2rem 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #374151 50%, transparent 100%);
  position: relative;
}

.md-hr::after {
  content: '◆';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #000;
  color: #00b6dd;
  padding: 0 0.5rem;
  font-size: 0.75rem;
}

/* Tables */
.md-table-wrapper {
  overflow-x: auto;
  margin: 1.5rem 0;
  border-radius: 12px;
  background: #0a0e1a;
  border: 1px solid #1f2937;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.5);
}

.md-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: 'Geist', sans-serif;
}

.md-thead {
  background: linear-gradient(90deg, #111827 0%, #0f172a 100%);
}

.md-th {
  padding: 0.75rem 1rem;
  text-align: left;
  font-weight: 600;
  color: #00b6dd;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  border-bottom: 2px solid #1f2937;
}

.md-td {
  padding: 0.75rem 1rem;
  color: #d1d5db;
  border-bottom: 1px solid #1f2937;
}

.md-tbody .md-tr:last-child .md-td {
  border-bottom: none;
}

.md-tbody .md-tr:hover {
  background: rgba(0, 182, 221, 0.05);
}

/* Mermaid diagrams */
.md-mermaid {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: #0a0e1a;
  border: 1px solid #1f2937;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  overflow-x: auto;
}

/* Scrollbar styling */
*::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

*::-webkit-scrollbar-track {
  background: #0a0e1a;
}

*::-webkit-scrollbar-thumb {
  background: #374151;
  border-radius: 4px;
}

*::-webkit-scrollbar-thumb:hover {
  background: #4b5563;
}

/* Animation for headers on scroll */
@keyframes slideInGradient {
  from {
    background-position: 0% 50%;
  }
  to {
    background-position: 100% 50%;
  }
}

.md-h1:hover, .md-h2:hover, .md-h3:hover {
  background-size: 200% 200%;
  animation: slideInGradient 3s ease infinite;
}

/* KaTeX math styling */
.katex-display {
  margin: 1.5rem 0;
  overflow-x: auto;
  padding: 1rem;
  background: #0a0e1a;
  border-radius: 8px;
  border: 1px solid #1f2937;
}

.katex {
  color: #e5e7eb;
  font-size: 1.1rem;
}</pre>
    </div>

    <h2>Additional Creative Features</h2>
    <div class="code-block">
      <pre>/* Animated emphasis markers for important content */
.md-important {
  position: relative;
  padding: 1rem 1.5rem;
  margin: 1.5rem 0;
  background: linear-gradient(135deg, rgba(0, 182, 221, 0.1) 0%, rgba(0, 182, 221, 0.05) 100%);
  border: 1px solid #00b6dd;
  border-radius: 12px;
  overflow: hidden;
}

.md-important::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(0, 182, 221, 0.1) 50%,
    transparent 70%
  );
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

/* Callout boxes for different types of content */
.md-callout {
  margin: 1.5rem 0;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  position: relative;
  padding-left: 3.5rem;
}

.md-callout::before {
  position: absolute;
  left: 1rem;
  top: 1rem;
  font-size: 1.5rem;
}

.md-callout-info {
  background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
  border: 1px solid #3b82f6;
}

.md-callout-info::before {
  content: 'ℹ';
  color: #3b82f6;
}

.md-callout-warning {
  background: linear-gradient(135deg, #713f12 0%, #78350f 100%);
  border: 1px solid #f59e0b;
}

.md-callout-warning::before {
  content: '⚠';
  color: #f59e0b;
}

.md-callout-success {
  background: linear-gradient(135deg, #14532d 0%, #166534 100%);
  border: 1px solid #10b981;
}

.md-callout-success::before {
  content: '✓';
  color: #10b981;
}

.md-callout-error {
  background: linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%);
  border: 1px solid #ef4444;
}

.md-callout-error::before {
  content: '✕';
  color: #ef4444;
}

/* Terminal-style code blocks */
.md-terminal {
  background: #000;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 0;
  font-family: 'JetBrains Mono', monospace;
  position: relative;
  padding-top: 2.5rem;
}

.md-terminal::before {
  content: '● ● ●';
  position: absolute;
  top: 0.75rem;
  left: 1rem;
  color: #666;
  letter-spacing: 0.5rem;
}

.md-terminal-line {
  color: #10b981;
  margin: 0.25rem 0;
}

.md-terminal-prompt {
  color: #00b6dd;
  margin-right: 0.5rem;
}

/* Keyboard shortcuts */
.md-kbd {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
  border: 1px solid #4b5563;
  border-radius: 6px;
  box-shadow: 0 2px 0 #111;
  color: #e5e7eb;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875em;
  font-weight: 600;
  vertical-align: middle;
}</pre>
    </div>
  </div>
</body>
</html>