"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useChat } from "@ai-sdk/react";

type Task = {
  title: string;
  dueDate: string;
  duration: string;
  priority: number;
  rawText: string;
  completed: boolean;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const DEFAULT_CHAT: Message[] = [];

type Theme = "light" | "dark";
// type FontSize = "sm" | "base" | "lg";
// type ColorScheme = "default" | "cool" | "warm";

type CalendarMode = "month";

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getNextWeekendDate() {
  const date = new Date();
  const weekday = date.getDay();
  const daysUntilSaturday = (6 - weekday + 7) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSaturday);
  return date.toISOString().slice(0, 10);
}

function formatDateInputValue(dueDate: string) {
  const normalized = dueDate.trim().toLowerCase();

  // 1. Déjà au bon format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate;
  }

  // 2. Format Français DD-MM-YYYY -> Convertir en YYYY-MM-DD
  const frDateMatch = normalized.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (frDateMatch) {
    return `${frDateMatch[3]}-${frDateMatch[2]}-${frDateMatch[1]}`;
  }

  // 3. Mots-clés
  if (normalized.includes("tomorrow")) return getDateOffset(1);
  if (normalized.includes("today")) return getDateOffset(0);
  if (normalized.includes("weekend")) return getNextWeekendDate();

  return "";
}

function isProductiveTask(title: string): boolean {
  const unproductiveKeywords = [
    "scrolling",
    "scroller",
    "netflix",
    "youtube",
    "tiktok",
    "instagram",
    "facebook",
    "twitter",
    "jouer",
    "gaming",
    "jeux",
    "game",
    "sieste",
    "sleep",
    "nap",
    "break",
    "pause",
  ];
  const lowerTitle = title.toLowerCase();
  return !unproductiveKeywords.some((keyword) => lowerTitle.includes(keyword));
}

function capitalizeTitle(title: string): string {
  return title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
}

const PRIORITY_SCHEMES: Record<ColorScheme, Record<number, string>> = {
  default: {
    1: "bg-red-100 border-red-300",
    2: "bg-orange-100 border-orange-300",
    3: "bg-yellow-100 border-yellow-300",
    4: "bg-blue-100 border-blue-300",
    5: "bg-green-100 border-green-300",
  },
  cool: {
    1: "bg-slate-200 border-slate-400",
    2: "bg-cyan-100 border-cyan-300",
    3: "bg-blue-100 border-blue-300",
    4: "bg-indigo-100 border-indigo-300",
    5: "bg-violet-100 border-violet-300",
  },
  warm: {
    1: "bg-rose-100 border-rose-300",
    2: "bg-orange-100 border-orange-300",
    3: "bg-amber-100 border-amber-300",
    4: "bg-amber-50 border-amber-200",
    5: "bg-lime-100 border-lime-300",
  },
};

function getPriorityColor(priority: number, scheme: ColorScheme) {
  return PRIORITY_SCHEMES[scheme][priority] ?? "bg-gray-100 border-gray-300";
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = (day + 6) % 7;
  copy.setDate(copy.getDate() - diff);
  return copy;
}

function getWeekDays(reference: Date) {
  const start = getStartOfWeek(reference);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function getMonthGrid(reference: Date) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = getStartOfWeek(firstDay);

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function isValidDateString(value: string) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function isWithinNextWeek(dueDate: string) {
  if (!isValidDateString(dueDate)) return false;
  const deadline = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  const diffDays = (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 7;
}

function parseTasksFromText(text: string): Task[] {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const titleMatch = line.match(/\[([^\]]+)\]/);
      const titleFallback = line
        .replace(/due date\s*/i, "")
        .replace(/takes.*$/i, "")
        .replace(/priority.*$/i, "")
        .trim();
      const rawTitle = titleMatch ? titleMatch[1].trim() : titleFallback || "Task";
      const title = capitalizeTitle(rawTitle);

      const dueMatch =
        line.match(/due date\s*([^\]]+?)(?=\s*(takes|priority|$))/i) ||
        line.match(/due\s*([^\]]+?)(?=\s*(takes|priority|$))/i);
      const rawDueDate = dueMatch ? dueMatch[1].trim() : "Unspecified";
      const dueDate = formatDateInputValue(rawDueDate) || rawDueDate;

      const durationMatch =
        line.match(/takes\s*about\s*([0-9]+(?:\.[0-9]+)?\s*[dhm])/i) ||
        line.match(/takes\s*([0-9]+(?:\.[0-9]+)?\s*[dhm])/i);
      const duration = durationMatch ? durationMatch[1].trim() : "Unspecified";

      const priorityMatch = line.match(/priority\s*[:\-]?\s*(\d+)/i);
      const priority = priorityMatch ? Number(priorityMatch[1]) : 3;

      return {
        title,
        dueDate,
        duration,
        priority,
        rawText: line,
        completed: false,
      };
    })
    .filter((task) => isProductiveTask(task.title));
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_CHAT);
  const [inputValue, setInputValue] = useState("");
  const [parsedTasks, setParsedTasks] = useState<Task[]>(parseTasksFromText(DEFAULT_CHAT.map((message) => message.text).join("\n")));
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"tasks" | "calendar">("tasks");
  const [theme, setTheme] = useState<Theme>("light");
  const [fontSize, setFontSize] = useState<FontSize>("base");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("default");
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month");
  const [calendarReference, setCalendarReference] = useState<Date | null>(null);
  const [draggedTaskIndex, setDraggedTaskIndex] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedTheme = window.localStorage.getItem("pro-motion-theme") as Theme | null;
    const storedFont = window.localStorage.getItem("pro-motion-font") as FontSize | null;
    const storedScheme = window.localStorage.getItem("pro-motion-scheme") as ColorScheme | null;
    if (storedTheme) setTheme(storedTheme);
    if (storedFont) setFontSize(storedFont);
    if (storedScheme) setColorScheme(storedScheme);
  }, []);

  useEffect(() => {
    setCalendarReference(new Date());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("pro-motion-theme", theme);
    window.localStorage.setItem("pro-motion-font", fontSize);
    window.localStorage.setItem("pro-motion-scheme", colorScheme);
  }, [theme, fontSize, colorScheme]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = { id: Date.now(), role: "user", text: inputValue.trim() };
    const nextMessages = [...messages, newMessage];
    const userText = nextMessages.filter((message) => message.role === "user").map((message) => message.text).join("\n");

    setMessages(nextMessages);
    setParsedTasks((current) => {
    const freshTasks = parseTasksFromText(userText);
    return freshTasks.map((newTask) => {
      // On cherche si la tâche existe déjà dans notre liste actuelle (via son texte brut)
      const existing = current.find((t) => t.rawText === newTask.rawText);
      
      // Si elle existe, on renvoie la version "existing" qui contient tes modifications (Edits)
      // Sinon, on prend la "newTask" fraîchement parsée
      return existing ? existing : newTask;
    });
  });
    setInputValue("");
  };

  const deleteGroupTasks = (dateString: string) => {
    const confirmDelete = window.confirm(
      `Êtes-vous sûr de vouloir supprimer toutes les tâches du ${new Date(dateString).toLocaleDateString()} ?`
    );

    if (confirmDelete) {
      setParsedTasks((current) => 
        current.filter((task) => task.dueDate !== dateString)
      );
    }
  };

  const handleReset = () => {
    setMessages(DEFAULT_CHAT);
    setParsedTasks(parseTasksFromText(DEFAULT_CHAT.map((message) => message.text).join("\n")));
    setInputValue("");
    setEditingTaskIndex(null);
  };

  const updateTaskField = (
    index: number,
    field: keyof Omit<Task, "rawText">,
    value: string | number | boolean
  ) => {
    setParsedTasks((current) =>
      current.map((task, taskIndex) =>
        taskIndex === index
          ? {
              ...task,
              [field]: value,
            }
          : task
      )
    );
  };

  const calendarTasks = useMemo(() => parsedTasks.filter((task) => isValidDateString(task.dueDate)), [parsedTasks]);

  const groupedTasks = useMemo(() => {
    return calendarTasks.reduce<Record<string, Task[]>>((acc, task) => {
      const key = task.dueDate;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [calendarTasks]);

  const weekDays = useMemo(() => calendarReference ? getWeekDays(calendarReference) : [], [calendarReference]);
  const monthGrid = useMemo(() => calendarReference ? getMonthGrid(calendarReference) : [], [calendarReference]);

  const fontSizeClass = fontSize === "sm" ? "text-sm" : fontSize === "lg" ? "text-lg" : "text-base";
const themeClass = theme === "dark" 
  ? "bg-slate-950 text-white" // Le texte de tout le site devient blanc ici
  : "bg-zinc-50 text-zinc-950";  const cardTheme = theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-white border-zinc-200";
  const headerTheme = theme === "dark" ? "bg-slate-900/80 border-slate-800 backdrop-blur-md text-white" : "bg-white/80 border-zinc-200 backdrop-blur-md text-zinc-950";

  const setPreviousPeriod = () => {
    const current = new Date(calendarReference);
    if (calendarMode === "week") {
      current.setDate(current.getDate() - 7);
    } else {
      current.setMonth(current.getMonth() - 1);
    }
    setCalendarReference(new Date(current));
  };

  const setNextPeriod = () => {
    const current = new Date(calendarReference);
    if (calendarMode === "week") {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
    setCalendarReference(new Date(current));
  };

  const handleTaskDragStart = (index: number, event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData("text/plain", String(index));
    setDraggedTaskIndex(index);
  };

  const handleCellDrop = (dateString: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (!Number.isNaN(index)) {
      updateTaskField(index, "dueDate", dateString);
      setDraggedTaskIndex(null);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const heatClass = (count: number) => {
    if (count >= 4) return theme === "dark" ? "bg-slate-600" : "bg-slate-300";
    if (count === 3) return theme === "dark" ? "bg-slate-700" : "bg-slate-200";
    if (count === 2) return theme === "dark" ? "bg-slate-800" : "bg-slate-100";
    if (count === 1) return theme === "dark" ? "bg-slate-900" : "bg-zinc-50";
    return theme === "dark" ? "bg-slate-950" : "bg-white";
  };

  const rushSessionTasks = useMemo(
    () => parsedTasks.filter((task) => isWithinNextWeek(task.dueDate)),
    [parsedTasks]
  );

  const rushModeActive = rushSessionTasks.length >= 4;

  const unlockedPriority = useMemo(() => {
    if (!rushModeActive) return 1;

    for (let priority = 1; priority <= 5; priority += 1) {
      const priorityTasks = rushSessionTasks.filter((task) => task.priority === priority);
      if (priorityTasks.length === 0) continue;
      if (priorityTasks.some((task) => !task.completed)) {
        return priority;
      }
    }

    return 6;
  }, [rushModeActive, rushSessionTasks]);

  const canToggleCompletion = (task: Task) => {
    if (!rushModeActive) return true;
    if (!isWithinNextWeek(task.dueDate)) return true;
    return task.completed || task.priority === unlockedPriority;
  };

  const displayTaskCount = (dateString: string) => groupedTasks[dateString]?.length ?? 0;

  return (
    <div className={`${themeClass} ${fontSizeClass} min-h-screen transition-colors duration-300`}>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10">
        <header className={`${cardTheme} rounded-3xl border p-6 shadow-sm`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Image src="/promotion_logo.png" alt="Logo" width={200} height={200} priority />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                  theme === "dark" ? "bg-sky-600" : "bg-slate-200"
                }`}
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {/* Rond glissant */}
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ${
                    theme === "dark" ? "translate-x-9" : "translate-x-1"
                  }`}
                >
                  {theme === "dark" ? (
                    // Icône lune
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-sky-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                    </svg>
                  ) : (
                    // Icône soleil
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4a1 1 0 011-1V2a1 1 0 10-2 0v1a1 1 0 011 1zm0 16a1 1 0 01-1 1v1a1 1 0 102 0v-1a1 1 0 01-1-1zm8-8a1 1 0 011-1h1a1 1 0 100-2h-1a1 1 0 01-1 1zm-16 0a1 1 0 01-1 1H2a1 1 0 100 2h1a1 1 0 001-1zm13.07-5.07a1 1 0 011.41 0l.71.71a1 1 0 11-1.41 1.41l-.71-.71a1 1 0 010-1.41zM5.64 18.36a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zm12.02.7a1 1 0 010-1.41l.71-.71a1 1 0 111.41 1.41l-.71.71a1 1 0 01-1.41 0zM4.22 7.05a1 1 0 010-1.41l.71-.71a1 1 0 011.41 1.41l-.71.71a1 1 0 01-1.41 0zM12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tasks")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === "tasks" ? "bg-sky-600 text-white" : "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"}`}
              >
                Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("calendar")}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === "calendar" ? "bg-sky-600 text-white" : "border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100"}`}
              >
                Calendar
              </button>
            </div>
          </div>
        </header>

        {activeTab === "tasks" ? (
          <section className={`${cardTheme} rounded-3xl border p-8 shadow-sm`}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Task dashboard</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Convert your messages into tasks</h1>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Main chat</p>
                    <p className="text-sm text-slate-500">Type task notes and the assistant will parse them.</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">Auto analysis</span>
                </div>

                <div className="space-y-4">
                  <textarea
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    rows={4}
                    placeholder="Type a new task, e.g. due date tomorrow [studying] takes about 2h priority 1"
                    className="min-h-[140px] w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Add to Chat
                  </button>
                </div>
              </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">Tasks</h2>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${rushModeActive ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                        {rushModeActive ? "Rush mode active" : ""}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">Drag to reschedule in the calendar view.</p>
                    {rushModeActive && (
                      <p className="mt-2 text-xs text-rose-600">
                        Only priority {unlockedPriority} tasks in this Rush session can be completed until that group is done.
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">{parsedTasks.length} tasks</span>
                </div>

                <div className="space-y-4">
                  {parsedTasks.map((task, index) => {
                    const isEditing = editingTaskIndex === index;
                    const taskDetails = isEditing ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Title</span>
                            <input
                              type="text"
                              value={task.title}
                              onChange={(event) => updateTaskField(index, "title", event.target.value)}
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />
                          </label>
                          <label className="space-y-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Due date</span>
                            <input
                              type="date"
                              value={formatDateInputValue(task.dueDate)}
                              onChange={(event) => updateTaskField(index, "dueDate", event.target.value)}
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />
                            {!formatDateInputValue(task.dueDate) && (
                              <p className="text-xs text-slate-500">Parsed value: {task.dueDate}</p>
                            )}
                          </label>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="space-y-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Estimated duration</span>
                            <input
                              type="text"
                              value={task.duration}
                              onChange={(event) => updateTaskField(index, "duration", event.target.value)}
                              placeholder="1h or max 3d"
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            />
                          </label>
                          <label className="space-y-2 text-sm text-slate-700">
                            <span className="font-semibold text-slate-900">Priority</span>
                            <select
                              value={task.priority}
                              onChange={(event) => updateTaskField(index, "priority", Number(event.target.value))}
                              className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                            >
                              {[1, 2, 3, 4, 5].map((value) => (
                                <option key={value} value={value}>
                                  {value}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className={`rounded-3xl border-2 px-4 py-3 text-sm font-semibold text-slate-900 ${getPriorityColor(task.priority, colorScheme)}`}>
                        {task.title} takes {task.duration}
                      </div>
                    )

                    return (
                      <div
                        key={`${task.rawText}-${index}`}
                        draggable
                        onDragStart={(event) => handleTaskDragStart(index, event)}
                        className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:bg-slate-50"
                      >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                disabled={!canToggleCompletion(task)}
                                onChange={() => updateTaskField(index, "completed", !task.completed)}
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className={task.completed ? "line-through text-slate-400" : "text-slate-500"}>{task.rawText}</span>
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => setEditingTaskIndex(isEditing ? null : index)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
                          >
                            {isEditing ? "Close" : "Edit"}
                          </button>
                        </div>

                        {!canToggleCompletion(task) && (
                          <p className="mb-4 text-xs text-rose-600">Rush active: only priority {unlockedPriority} tasks can be completed.</p>
                        )}

                        {taskDetails}
                      </div>
                    );
                  })}
                {parsedTasks.length === 0 && (
                  <p className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                    No tasks detected. Add messages with due date, takes about and priority.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className={`${cardTheme} rounded-3xl border p-8 shadow-sm`}>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Calendar view</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Schedule tasks by date</h1>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Drag tasks to a day</h2>
              </div>

              <div className="space-y-4">
                {calendarMode === "month" && (
                  <div className={`rounded-3xl border border-slate-200 ${theme === "dark" ? "bg-slate-950" : "bg-white"} p-4`}>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label) => (
                        <div key={label}>{label}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {monthGrid.map((day) => {
                        const dateString = day.toISOString().slice(0, 10);
                        const count = displayTaskCount(dateString);
                        const inMonth = day.getMonth() === calendarReference.getMonth();
                        return (
                          <div
                            key={dateString}
                            onDrop={(event) => handleCellDrop(dateString, event)}
                            onDragOver={handleDragOver}
                            className={`min-h-[96px] rounded-3xl border p-2 transition ${inMonth ? heatClass(count) : theme === "dark" ? "bg-slate-900" : "bg-slate-100"}`}
                          >
                            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                              <span>{day.getDate()}</span>
                              <span>{count}</span>
                            </div>
                            <div className="space-y-1 text-[11px] text-slate-700">
                              {(groupedTasks[dateString] ?? []).slice(0, 2).map((task) => (
                                <div key={`${task.rawText}-${dateString}`} className={`rounded-full px-2 py-1 ${getPriorityColor(task.priority, colorScheme)} text-slate-900`}>
                                  {task.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
