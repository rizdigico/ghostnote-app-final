import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

const TextArea: React.FC<TextAreaProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-3 w-full h-full group">
      <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1 group-focus-within:text-textMain transition-colors">
        {label}
      </label>
      <textarea
        className={`w-full bg-surface border border-border rounded-md p-5 text-textMain font-mono text-sm leading-relaxed placeholder-textMuted/30 focus:border-textMuted focus:outline-none transition-colors resize-none ${className}`}
        spellCheck={false}
        {...props}
      />
    </div>
  );
};

export default TextArea;