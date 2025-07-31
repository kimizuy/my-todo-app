import { Input } from "~/components/ui/input";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function Filter({ value, onChange }: Props) {
  return (
    <div className="w-full">
      <Input
        type="text"
        placeholder="タスクを絞り込む..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
        aria-label="タスクを絞り込む"
      />
    </div>
  );
}
