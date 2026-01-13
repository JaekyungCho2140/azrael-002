/**
 * Input Component
 * 참조: prd/Azrael-PRD-Design.md §5.2 Input Fields
 */

import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="input-wrapper">
      {label && <label className="input-label">{label}</label>}
      <input className={`input ${className}`} {...props} />
    </div>
  );
}
