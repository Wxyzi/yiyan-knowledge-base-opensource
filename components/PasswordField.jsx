"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  placeholder,
  minLength = 6,
  disabled = false,
  lang = "zh"
}) {
  const isZh = lang !== "en";
  const visibilityLabel = visible
    ? (isZh ? "隐藏密码" : "Hide password")
    : (isZh ? "显示密码" : "Show password");

  return (
    <label className="field-stack" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="auth-input-wrap auth-password-wrap">
        <LockKeyhole size={17} aria-hidden="true" />
        <input
          className="input"
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          minLength={minLength}
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={onToggle}
          title={visibilityLabel}
          aria-label={visibilityLabel}
          disabled={disabled}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
