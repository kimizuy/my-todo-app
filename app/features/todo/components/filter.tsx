import { X } from "lucide-react";
import { Input } from "~/shared/components/ui/input";
import { cn } from "~/shared/lib/cn";

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
        placeholder="タスクを絞り込む"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full min-w-[200px] pr-10",
          value &&
            "border-blue-500 ring-[3px] ring-blue-500/30 focus-visible:border-blue-500 focus-visible:ring-blue-500/30",
        )}
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
