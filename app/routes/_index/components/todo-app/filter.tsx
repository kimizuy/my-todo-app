import { X } from "lucide-react";
import { Input } from "~/components/ui/input";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function Filter({ value, onChange }: Props) {
  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="relative w-full">
      <Input
        type="text"
        placeholder="タスクを絞り込む..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-w-[200px] pr-10"
        aria-label="タスクを絞り込む"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer transition-colors"
          aria-label="入力をクリア"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
