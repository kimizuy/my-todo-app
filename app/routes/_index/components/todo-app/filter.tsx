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
        placeholder="タスクを検索..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full"
        aria-label="タスクを検索"
      />
    </div>
  );
}
