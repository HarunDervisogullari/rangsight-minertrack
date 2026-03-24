"use client";
import React, { useEffect, useState } from "react";

interface PhoneInputProps {
  value?: string;
  placeholder?: string;
  onChange?: (phoneNumber: string) => void;
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  placeholder = "+90 (555) 444 22 33",
  onChange,
}) => {
  const [phone, setPhone] = useState(value ?? "+90 ");

  useEffect(() => {
    if (value !== undefined) {
      setPhone(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    if (!value.startsWith("+90 ")) {
      value = "+90 ";
    }

    value = value.replace(/[^\d\s()]/g, "");
    const digits = value.replace(/\D/g, "").slice(2);
    let formatted = "+90 ";

    if (digits.length > 0) {
      formatted += "(" + digits.substring(0, 3);
    }
    if (digits.length >= 3) {
      formatted += ") " + digits.substring(3, 6);
    }
    if (digits.length >= 6) {
      formatted += " " + digits.substring(6, 8);
    }
    if (digits.length >= 8) {
      formatted += " " + digits.substring(8, 10);
    }

    setPhone(formatted.trim());
    if (onChange) {
      onChange(formatted.trim());
    }
  };

  return (
    <input
      type="tel"
      value={phone}
      onChange={handleChange}
      placeholder={placeholder}
      className="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-3 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
    />
  );
};

export default PhoneInput;
