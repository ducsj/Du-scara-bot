import { ReactNode } from 'preact/compat';
import cn from 'clsx';
import s from './button.module.css';

interface ButtonGroupProps {
  children: ReactNode;
  wrap?: boolean;
}

export function ButtonGroup({ children, wrap }: ButtonGroupProps) {
  return <div className={cn(s.group, wrap && s.wrap)}>{children}</div>;
}
