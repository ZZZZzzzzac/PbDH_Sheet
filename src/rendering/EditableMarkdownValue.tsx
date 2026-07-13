import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { RestrictedMarkdown } from "./RestrictedMarkdown";

interface EditableMarkdownValueProps {
  value: string;
  accessibleName: string;
  input: (props: EditableMarkdownInputProps) => ReactNode;
}

export interface EditableMarkdownInputProps {
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}

export function EditableMarkdownValue({ value, accessibleName, input }: EditableMarkdownValueProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const showEditor = editing || value === "";

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const beginEditing = () => setEditing(true);
  const onPreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      beginEditing();
    }
  };

  return (
    <>
      {showEditor ? (
        <div data-markdown-editor="true">
          {input({
            ref: inputRef,
            value,
            onChange: () => setEditing(true),
            onFocus: beginEditing,
            onBlur: () => setEditing(false),
          })}
        </div>
      ) : null}
      <div
        className="markdown-preview"
        data-part="input"
        data-markdown-preview="true"
        hidden={showEditor}
        aria-hidden={showEditor ? "true" : undefined}
        role={showEditor ? undefined : "button"}
        tabIndex={showEditor ? undefined : 0}
        aria-label={showEditor ? undefined : accessibleName}
        onClick={beginEditing}
        onKeyDown={onPreviewKeyDown}
      >
        <RestrictedMarkdown value={value} />
      </div>
    </>
  );
}
