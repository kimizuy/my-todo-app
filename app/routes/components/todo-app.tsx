import { useState, useEffect, type FormEvent } from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const FILTERS = [
  { label: "すべて", value: "all" },
  { label: "未完了", value: "active" },
  { label: "完了済み", value: "completed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 p-3">
      <Label>
        <Checkbox
          checked={todo.completed}
          onCheckedChange={() => onToggle(todo.id)}
        />
        {todo.text}
      </Label>
      <Button onClick={() => onDelete(todo.id)} variant="destructive">
        削除
      </Button>
    </div>
  );
}

function TodoForm({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState<string>("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="新しいタスクを入力..."
        />
        <Button type="submit">追加</Button>
      </div>
    </form>
  );
}

function TodoFilter({
  selectedFilter,
  onFilterChange,
}: {
  selectedFilter: Filter;
  onFilterChange: (filter: Filter) => void;
}) {
  const handleClick = (filter: Filter) => {
    if (filter !== selectedFilter) {
      onFilterChange(filter);
    }
  };

  return (
    <div className="flex justify-center space-x-4">
      {FILTERS.map((filter) => (
        <Button
          key={filter.value}
          variant="outline"
          onClick={() => handleClick(filter.value)}
          disabled={filter.value === selectedFilter}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

export function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(function initializeTodos() {
    const loadTodos = (): Todo[] => {
      try {
        const savedTodos = localStorage.getItem("todos");
        if (savedTodos) {
          return JSON.parse(savedTodos);
        }
      } catch (error) {
        console.error("Failed to load todos from localStorage:", error);
      }
      return [];
    };

    setTodos(loadTodos());
  }, []);

  useEffect(
    function saveTodos() {
      try {
        localStorage.setItem("todos", JSON.stringify(todos));
      } catch (error) {
        console.error("Failed to save todos to localStorage:", error);
      }
    },
    [todos],
  );

  const addTodo = (text: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
    };
    setTodos((prevTodos) => [...prevTodos, newTodo]);
  };

  const toggleTodo = (id: string) => {
    setTodos((prevTodos) =>
      prevTodos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const clearCompleted = () => {
    setTodos((prevTodos) => prevTodos.filter((todo) => !todo.completed));
  };

  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg bg-white p-6 shadow-md">
      <h1 className="text-center text-2xl font-bold">TODOアプリ</h1>
      <div className="mt-6 grid gap-6">
        <TodoForm onAdd={addTodo} />
        <TodoFilter selectedFilter={filter} onFilterChange={setFilter} />

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            {todos.filter((todo) => !todo.completed).length} 個の未完了タスク
          </span>
          <Button
            onClick={clearCompleted}
            variant="destructive"
            disabled={!todos.some((todo) => todo.completed)}
          >
            完了済みをクリア
          </Button>
        </div>

        <div>
          {filteredTodos.length > 0 ? (
            filteredTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
              />
            ))
          ) : (
            <p className="text-center text-gray-500">タスクがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
