import { useState, useEffect } from 'preact/hooks';
import s from './input.module.css';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function NumberInput({
  value,
  onChange,
  label = '',
  unit = '',
  min = 0,
  max = Infinity,
  step = 1,
}: NumberInputProps) {
  const [textValue, setTextValue] = useState(value.toString());

  useEffect(() => {
    setTextValue(value.toString());
  }, [value]);

  const handleBlur = () => {
    let num = parseFloat(textValue);
    if (isNaN(num)) {
      num = value;
    }
    // Clamp to range
    if (num < min) num = min;
    if (!isFinite(max)) {
      // No max limit
    } else if (num > max) {
      num = max;
    }
    setTextValue(num.toString());
    onChange(num);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <label className={s.inputContainer}>
      {label && <span className={s.label}>{label}</span>}
      <div className={s.inputWrapper}>
        <input
          className={s.textInput}
          type="text"
          inputMode="decimal"
          value={textValue}
          onInput={e => setTextValue((e.target as HTMLInputElement).value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        {unit && <span className={s.unit}>{unit}</span>}
      </div>
    </label>
  );
}