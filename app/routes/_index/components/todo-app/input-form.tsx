/// <reference types="user-agent-data-types" />
import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";

interface Props {
  onAddTask: (content: string) => void;
}

export function InputForm({ onAddTask }: Props) {
  const [todoInput, setTodoInput] = useState<string>("");
  const [isMac, setIsMac] = useState<boolean>(false);
  const [submitMode, setSubmitMode] = useState<"cmd-enter" | "enter">(
    "cmd-enter",
  );

  useEffect(function detectMacPlatform() {
    const platform = navigator.userAgentData?.platform;
    if (platform) {
      setIsMac(platform.includes("mac"));
    }
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

  const addTask = useCallback(() => {
    if (!todoInput.trim()) return;
    onAddTask(todoInput.trim());
    setTodoInput("");
  }, [todoInput, onAddTask]);

  const handleAddTask = (event: FormEvent) => {
    event.preventDefault();
    addTask();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
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
      <form className="flex gap-2" onSubmit={handleAddTask}>
        <Textarea
          placeholder="新しいタスクを入力（マークダウン対応）"
          value={todoInput}
          onChange={(e) => setTodoInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="min-h-[40px] flex-1 resize-none"
          aria-label="新しいタスクを入力"
        />
        <Button type="submit">追加</Button>
      </form>
      <div className="mt-2 flex justify-end">
        <RadioGroup value={submitMode} onValueChange={handleSubmitModeChange}>
          <Label>
            <RadioGroupItem value="cmd-enter" />
            {isMac ? "⌘" : "Ctrl"}+Enter
          </Label>
          <Label>
            <RadioGroupItem value="enter" />
            Enter
          </Label>
        </RadioGroup>
      </div>
    </div>
  );
}
