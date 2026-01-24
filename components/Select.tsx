import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

const Select: React.FC<SelectProps> = ({ label, options, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-3 w-full group">
      <label className="text-xs font-semibold text-textMuted uppercase tracking-widest pl-1 group-focus-within:text-textMain transition-colors">
        {label}
      </label>
      <div className="relative">
        <select
          className={`appearance-none w-full bg-surface border border-border rounded-md pl-4 pr-10 py-3 text-sm text-textMain font-medium focus:border-textMuted focus:outline-none transition-colors cursor-pointer ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-textMuted">
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );
};

export default Select;