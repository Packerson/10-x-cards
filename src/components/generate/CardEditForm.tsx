import { useState, useCallback, useEffect, useRef, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "./CharacterCounter";
import type { CardEditFormProps } from "./types";

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

export function CardEditForm({ initialFront, initialBack, onSave, onCancel }: CardEditFormProps) {
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const formRef = useRef<HTMLFormElement>(null);

  const isFrontValid = front.trim().length > 0 && front.length <= MAX_FRONT_LENGTH;
  const isBackValid = back.trim().length > 0 && back.length <= MAX_BACK_LENGTH;
  const isValid = isFrontValid && isBackValid;

  const handleSave = useCallback(() => {
    if (!isValid) return;
    onSave(front.trim(), back.trim());
  }, [front, back, isValid, onSave]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSave();
    },
    [handleSave]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [onCancel]);

  useEffect(() => {
    const handleOutsidePointerDown = (event: MouseEvent) => {
      const form = formRef.current;
      if (!form) return;
      if (form.contains(event.target as Node)) return;
      handleSave();
    };

    document.addEventListener("mousedown", handleOutsidePointerDown);
    return () => document.removeEventListener("mousedown", handleOutsidePointerDown);
  }, [handleSave]);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <label htmlFor="edit-front" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Przód
        </label>
        <input
          id="edit-front"
          type="text"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <CharacterCounter current={front.length} min={1} max={MAX_FRONT_LENGTH} />
      </div>

      <div className="space-y-1">
        <label htmlFor="edit-back" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tył
        </label>
        <textarea
          id="edit-back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          className="min-h-[80px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
          rows={3}
        />
        <CharacterCounter current={back.length} min={1} max={MAX_BACK_LENGTH} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" size="sm" disabled={!isValid}>
          Zapisz
        </Button>
      </div>
    </form>
  );
}
