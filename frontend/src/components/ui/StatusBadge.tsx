import React from 'react';
import { CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { RiskLevel } from '../../types/api.types';

interface StatusBadgeProps {
  riskLevel: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  riskLevel,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const sizeStyles: Record<string, string> = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes: Record<string, number> = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const config: Record<RiskLevel, {
    bgColor: string;
    bgColorValue: string;
    textColor: string;
    borderColor: string;
    borderColorValue: string;
    icon: React.ReactNode;
    label: string;
  }> = {
    [RiskLevel.LOW]: {
      bgColor: 'bg-success-50',
      bgColorValue: '#ECFDF3', // success-50
      textColor: 'text-success-700',
      borderColor: 'border-success-600',
      borderColorValue: '#079455', // success-600
      icon: <CheckCircle size={iconSizes[size]} />,
      label: 'Low Risk',
    },
    [RiskLevel.MEDIUM]: {
      bgColor: 'bg-warning-50',
      bgColorValue: '#FFFAEB', // warning-50
      textColor: 'text-warning-700',
      borderColor: 'border-warning-500',
      borderColorValue: '#F79009', // warning-500
      icon: <AlertTriangle size={iconSizes[size]} />,
      label: 'Moderate Risk',
    },
    [RiskLevel.HIGH]: {
      bgColor: 'bg-error-50',
      bgColorValue: '#FEF3F2', // error-50
      textColor: 'text-error-700',
      borderColor: 'border-error-600',
      borderColorValue: '#D92D20', // error-600
      icon: <AlertCircle size={iconSizes[size]} />,
      label: 'High Risk',
    },
  };

  const { bgColorValue, textColor, borderColorValue, icon, label } = config[riskLevel];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border-2 ${textColor} ${sizeStyles[size]} ${className}`}
      style={{
        backgroundColor: bgColorValue,
        borderColor: borderColorValue,
      }}
    >
      {showIcon && icon}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
