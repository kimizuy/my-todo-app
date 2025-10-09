/// <reference types="user-agent-data-types" />
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/shared/components/ui/button";
import { Label } from "~/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/shared/components/ui/radio-group";
import { Textarea } from "~/shared/components/ui/textarea";

interface Props {
  onAddTask: (content: string) => void;
}

export function InputForm({ onAddTask }: Props) {
  const [todoInput, setTodoInput] = useState<string>("");
  const [isMac, setIsMac] = useState<boolean>(false);
  const [submitMode, setSubmitMode] = useState<"cmd-enter" | "enter">(
    "cmd-enter",
  );
  const [isComposing, setIsComposing] = useState<boolean>(false);

  useEffect(function detectMacPlatform() {
    const platform = navigator.userAgentData?.platform || navigator.userAgent;
    setIsMac(platform.toLowerCase().includes("mac"));
  }, []);

  useEffect(function loadSubmitMode() {
    try {
      const saved = localStorage.getItem("submitMode");
      if (saved && (saved === "cmd-enter" || saved === "enter")) {
        setSubmitMode(saved);
      }
    } catch (error) {
      console.error("送信モード設定の読み込みに失敗しました:", error);
    }
  }, []);

  const addTask = () => {
    if (!todoInput.trim()) return;
    onAddTask(todoInput.trim());
    setTodoInput("");
  };

  const handleAddTask = (event: FormEvent) => {
    event.preventDefault();
    addTask();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !isComposing) {
      if (submitMode === "cmd-enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        addTask();
      } else if (
        submitMode === "enter" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        addTask();
      }
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  const handleSubmitModeChange = (value: string) => {
    const newMode = value as "cmd-enter" | "enter";
    setSubmitMode(newMode);
    try {
      localStorage.setItem("submitMode", newMode);
    } catch (error) {
      console.error("送信モード設定の保存に失敗しました:", error);
    }
  };

  return (
    <div>
      <form
        className="flex flex-row items-center gap-2"
        onSubmit={handleAddTask}
      >
        <Textarea
          placeholder="タスクを入力（マークダウン対応）"
          value={todoInput}
          onChange={(e) => setTodoInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          className="min-h-[40px] min-w-[200px] flex-1 resize-none"
          aria-label="新しいタスクを入力"
        />
        <div className="flex items-center gap-2">
          <Button type="submit">追加</Button>
          <RadioGroup
            value={submitMode}
            onValueChange={handleSubmitModeChange}
            className="hidden flex-col gap-1 md:flex"
          >
            <Label className="flex items-center gap-1 text-sm">
              <RadioGroupItem value="cmd-enter" />
              {isMac ? "⌘" : "Ctrl"}+Enter
            </Label>
            <Label className="flex items-center gap-1 text-sm">
              <RadioGroupItem value="enter" />
              Enter
            </Label>
          </RadioGroup>
        </div>
      </form>
    </div>
  );
}
