"use client";

import Image from "next/image";
import { useState } from "react";

type Task = {
  title: string;
  dueDate: string;
  duration: string;
  priority: number;
  rawText: string;
};

type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

const DEFAULT_CHAT = [
  {
    id: 1,
    role: "user",
    text: "due date by the weekend [laundry] takes about 1h priority 2",
  },
  {
    id: 2,
    role: "user",
    text: "due date tomorrow [study] takes about 2h priority 1",
  },
];

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    return dueDate;
  }
  if (normalized.includes("tomorrow")) {
    return getDateOffset(1);
  }
  if (normalized.includes("today")) {
    return getDateOffset(0);
  }
  if (normalized.includes("weekend")) {
    return getNextWeekendDate();
  }
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

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1:
      return "bg-red-100 border-red-300";
    case 2:
      return "bg-orange-100 border-orange-300";
    case 3:
      return "bg-yellow-100 border-yellow-300";
    case 4:
      return "bg-blue-100 border-blue-300";
    case 5:
      return "bg-green-100 border-green-300";
    default:
      return "bg-gray-100 border-gray-300";
  }
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
      const rawTitle = titleMatch ? titleMatch[1].trim() : titleFallback || "Tâche";
      const title = capitalizeTitle(rawTitle);

      const dueMatch =
        line.match(/due date\s*([^\]]+?)(?=\s*(takes|priority|$))/i) ||
        line.match(/due\s*([^\]]+?)(?=\s*(takes|priority|$))/i);
      const rawDueDate = dueMatch ? dueMatch[1].trim() : "À définir";
      const dueDate = formatDateInputValue(rawDueDate) || rawDueDate;

      const durationMatch =
        line.match(/takes\s*about\s*([0-9]+(?:\.[0-9]+)?\s*[dhm])/i) ||
        line.match(/takes\s*([0-9]+(?:\.[0-9]+)?\s*[dhm])/i);
      const duration = durationMatch ? durationMatch[1].trim() : "Non précisé";

      const priorityMatch = line.match(/priority\s*[:\-]?\s*(\d+)/i);
      const priority = priorityMatch ? Number(priorityMatch[1]) : 3;

      return {
        title,
        dueDate,
        duration,
        priority,
        rawText: line,
      };
    })
    .filter((task) => isProductiveTask(task.title));
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>(DEFAULT_CHAT);
  const [inputValue, setInputValue] = useState("");
  const [parsedTasks, setParsedTasks] = useState<Task[]>(parseTasksFromText(DEFAULT_CHAT.map((message) => message.text).join("\n")));
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage = { id: Date.now(), role: "user", text: inputValue.trim() };
    const nextMessages = [...messages, newMessage];

    setMessages(nextMessages);
    setParsedTasks((previousTasks) => {
      const freshTasks = parseTasksFromText(nextMessages.filter((message) => message.role === "user").map((message) => message.text).join("\n"));
      return freshTasks.map((task) => {
        const existing = previousTasks.find((current) => current.rawText === task.rawText);
        return existing ? { ...existing, ...task } : task;
      });
    });
    setInputValue("");
  };

  const handleReset = () => {
    setMessages(DEFAULT_CHAT);
    setParsedTasks(parseTasksFromText(DEFAULT_CHAT.map((message) => message.text).join("\n")));
    setInputValue("");
  };

  const updateTaskField = (index: number, field: keyof Omit<Task, "rawText">, value: string | number) => {
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <head>
        <title>Pro-motion</title>
        <link rel="icon" href="/promotion_logo.png" />
      </head>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image src="/promotion_logo.png" alt="Logo" width={180} height={60} priority />
          </div>
          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-zinc-700">
            <a href="#chat" className="transition hover:text-slate-900">Chat</a>
            <a href="#dashboard" className="transition hover:text-slate-900">Dashboard</a>
            <a href="#edition" className="rounded-full bg-sky-600 px-4 py-2 text-white transition hover:bg-sky-700">Edit</a>
          </nav>
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm" id="chat">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Task Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">Convert your messages into tasks</h1>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300"
            >
              Reset
            </button>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-600">Main Chat</p>
                  <p className="text-sm text-zinc-500">Text is automatically analyzed to fill tasks.</p>
                </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">Auto Analysis</span>
              </div>

              <div className="space-y-4">
                <textarea
                  value={inputValue}
                  onChange={(event) => setInputValue(event.target.value)}
                  rows={4}
                    placeholder="Type a new task e.g., due date tomorrow [studying] takes about 2h priority 1"
                  className="min-h-[140px] w-full resize-none rounded-3xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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

            <div className="rounded-3xl border border-zinc-200 bg-white p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-950">Tasks</h2>
                  <p className="text-sm text-zinc-500">Click Edit to modify each task in place.</p>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">{parsedTasks.length} tasks</span>
              </div>

              <div className="space-y-4">
                {parsedTasks.map((task, index) => {
                  const isEditing = editingTaskIndex === index;
                  return (
                    <div key={`${task.rawText}-${index}`} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 shadow-sm transition hover:border-sky-200">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-500 truncate">{task.rawText}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingTaskIndex(isEditing ? null : index)}
                          className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50"
                        >
                          {isEditing ? "Close" : "Edit"}
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2 text-sm text-zinc-700">
                              <span className="font-semibold text-zinc-900">Title</span>
                              <input
                                type="text"
                                value={task.title}
                                onChange={(event) => updateTaskField(index, "title", event.target.value)}
                                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                            </label>
                            <label className="space-y-2 text-sm text-zinc-700">
                              <span className="font-semibold text-zinc-900">Due Date</span>
                              <input
                                type="date"
                                value={formatDateInputValue(task.dueDate)}
                                onChange={(event) => updateTaskField(index, "dueDate", event.target.value)}
                                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                              {!formatDateInputValue(task.dueDate) && (
                                <p className="text-xs text-zinc-500">Parsed value: {task.dueDate}</p>
                              )}
                            </label>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2 text-sm text-zinc-700">
                              <span className="font-semibold text-zinc-900">Estimated Duration</span>
                              <input
                                type="text"
                                value={task.duration}
                                onChange={(event) => updateTaskField(index, "duration", event.target.value)}
                                placeholder="1h or max 3d"
                                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                              />
                            </label>

                            <label className="space-y-2 text-sm text-zinc-700">
                              <span className="font-semibold text-zinc-900">Priority</span>
                              <select
                                value={task.priority}
                                onChange={(event) => updateTaskField(index, "priority", Number(event.target.value))}
                                className="w-full rounded-3xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
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
                        <div className={`rounded-3xl border-2 px-4 py-3 text-sm font-semibold text-zinc-900 ${getPriorityColor(task.priority)}`}>
                          {task.title} takes {task.duration}
                        </div>
                      )}
                    </div>
                  );
                })}
                {parsedTasks.length === 0 && (
                  <p className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-sm text-zinc-600">
                    No tasks detected. Add messages with due date, takes about and priority.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
