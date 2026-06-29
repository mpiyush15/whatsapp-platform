import React, { useState, KeyboardEvent, ChangeEvent } from "react";

interface TagInputProps {
  /**
   * Current list of tags.
   */
  value: string[];
  /**
   * Callback when tags change.
   */
  onChange: (tags: string[]) => void;
  /**
   * Placeholder text for the input field.
   */
  placeholder?: string;
}

/**
 * Simple tag input component.
 * Users type a tag and press Enter or comma to add it.
 * Tags are displayed as removable chips.
 * Validation (max length, no leading $) is handled by backend via validateTags;
 * this component only trims whitespace and prevents empty duplicates.
 */
export default function TagInput({ value, onChange, placeholder = "Add a tag" }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    // Prevent duplicate (case‑insensitive)
    const exists = value.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    onChange([...value, trimmed]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (input) {
        addTag(input);
        setInput("");
      }
    } else if (e.key === "Backspace" && !input && value.length) {
      // Remove last tag on backspace when input is empty
      const newTags = value.slice(0, -1);
      onChange(newTags);
    }
  };

  const handleRemove = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    onChange(newTags);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-slate-300 p-2">
      {value.map((tag, idx) => (
        <span
          key={idx}
          className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            className="ml-1 text-blue-600 hover:text-blue-800"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] border-none focus:outline-none text-sm"
      />
    </div>
  );
}
