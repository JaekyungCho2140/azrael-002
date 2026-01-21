/**
 * Input Component
 * 참조: prd/Azrael-PRD-Design.md §5.2 Input Fields
 */

import React, { useId } from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id: providedId, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = providedId || generatedId;

  return (
    <div className="input-wrapper">
      {label && <label className="input-label" htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={`input ${className}`} {...props} />
    </div>
  );
}
