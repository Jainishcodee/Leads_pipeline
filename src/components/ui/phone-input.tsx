import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CountryCode {
  id: string;
  code: string;
  country: string;
  maxLength: number;
}

const countryCodes: CountryCode[] = [
  { id: 'IN', code: '+91', country: 'India', maxLength: 10 },
  { id: 'US', code: '+1', country: 'USA', maxLength: 10 },
  { id: 'CA', code: '+1', country: 'Canada', maxLength: 10 },
  { id: 'AE', code: '+971', country: 'UAE', maxLength: 9 },
  { id: 'AU', code: '+61', country: 'Australia', maxLength: 9 },
];

interface PhoneInputProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}

export function PhoneInput({
  id = 'phone',
  label,
  value,
  onChange,
  placeholder = 'Enter phone number',
  className,
  disabled = false,
  required = false,
  error,
}: PhoneInputProps) {
  const [selectedCountryId, setSelectedCountryId] = useState<CountryCode['id']>('IN');
  const [phoneNumber, setPhoneNumber] = useState('');
  const lastEmittedValueRef = useRef<string | null>(null);

  // Parse initial value
  useEffect(() => {
    if (lastEmittedValueRef.current === value) return;

    if (!value) {
      setPhoneNumber('');
      return;
    }

    const normalizedValue = value.trim();
    const matchedCountry =
      [...countryCodes]
        .sort((a, b) => b.code.length - a.code.length)
        .find((c) => normalizedValue.startsWith(c.code)) ?? null;

    if (!matchedCountry) {
      setPhoneNumber(normalizedValue.replace(/[^0-9]/g, ''));
      return;
    }

    setSelectedCountryId(matchedCountry.id);
    const numberPart = normalizedValue.slice(matchedCountry.code.length);
    setPhoneNumber(numberPart.replace(/[^0-9]/g, '').slice(0, matchedCountry.maxLength));
  }, [value]);

  const emitChange = (nextCountry: CountryCode, nextNumber: string) => {
    const trimmedNumber = nextNumber.replace(/[^0-9]/g, '').slice(0, nextCountry.maxLength);
    const nextValue = trimmedNumber.length > 0 ? `${nextCountry.code}${trimmedNumber}` : '';
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  };

  const handleCountryChange = (newCountryId: string) => {
    const nextCountry = countryCodes.find((c) => c.id === newCountryId) ?? countryCodes[0];
    setSelectedCountryId(nextCountry.id);
    const trimmedNumber = phoneNumber.slice(0, nextCountry.maxLength);
    setPhoneNumber(trimmedNumber);
    emitChange(nextCountry, trimmedNumber);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedCountry = countryCodes.find((c) => c.id === selectedCountryId) ?? countryCodes[0];
    const newNumber = e.target.value.replace(/[^0-9]/g, '');
    const trimmedNumber = newNumber.slice(0, selectedCountry.maxLength);
    setPhoneNumber(trimmedNumber);
    emitChange(selectedCountry, trimmedNumber);
  };

  const selectedCountry = countryCodes.find((c) => c.id === selectedCountryId) ?? countryCodes[0];

  return (
    <div className={cn('space-y-2 min-w-0', className)}>
      {label && (
        <Label htmlFor={id} className="block pb-2 leading-6">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="flex min-w-0 gap-2">
        <Select value={selectedCountryId} onValueChange={handleCountryChange} disabled={disabled}>
          <SelectTrigger
            className={cn(
              'w-[72px] shrink-0 h-10 text-sm',
              error && 'border-red-500'
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countryCodes.map((country) => (
              <SelectItem key={`${country.id}-${country.code}`} value={country.id}>
                {country.code} {country.country}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={selectedCountry.maxLength}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn('flex-1 h-10 rounded-l-none min-w-0', error && 'border-red-500')}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
