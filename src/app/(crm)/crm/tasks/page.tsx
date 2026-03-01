'use client'

import { useState } from 'react'
import { useTasks, useUpdateTask } from '@/lib/crm/hooks'
import { format, isPast, isToday } from 'date-fns'
import { CheckSquare, Check, Filter, ChevronDown, Clock, AlertTriangle, GripVertical } from 'lucide-react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import EmptyState from '@/components/crm/EmptyState'

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const { data: tasks = [], isLoading } = useTasks({ status: statusFilter || undefined })
  const updateTask = useUpdateTask()

  const overdue = tasks.filter((t) => t.status === 'open' && t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))
  const today = tasks.filter((t) => t.due_at && isToday(new Date(t.due_at)))
  const upcoming = tasks.filter((t) => t.status === 'open' && t.due_at && !isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))
  const noDue = tasks.filter((t) => !t.due_at && t.status === 'open')
  const done = tasks.filter((t) => t.status === 'done')

  const sections = [
    ...(overdue.length > 0 ? [{ label: 'Overdue', tasks: overdue, color: 'text-red-600', accent: 'bg-red-500' }] : []),
    ...(today.length > 0 ? [{ label: 'Today', tasks: today, color: 'text-amber-600', accent: 'bg-amber-400' }] : []),
    ...(upcoming.length > 0 ? [{ label: 'Upcoming', tasks: upcoming, color: 'text-[var(--warm-600)]', accent: 'bg-blue-400' }] : []),
    ...(noDue.length > 0 ? [{ label: 'No due date', tasks: noDue, color: 'text-[var(--warm-400)]', accent: 'bg-[var(--warm-300)]' }] : []),
    ...(done.length > 0 ? [{ label: 'Completed', tasks: done, color: 'text-[var(--warm-300)]', accent: 'bg-emerald-400' }] : []),
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--warm-900)]">Tasks</h1>
          <p className="text-sm text-[var(--warm-500)] mt-0.5">
            {tasks.filter((t) => t.status === 'open').length} open
            {overdue.length > 0 && <span className="text-red-500 ml-1">({overdue.length} overdue)</span>}
          </p>
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)]" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-8 pr-8 py-2.5 text-sm bg-white border border-[var(--warm-100)] rounded-xl focus:border-[var(--green-500)] focus:outline-none appearance-none text-[var(--warm-700)]"
          >
            <option value="open">Open</option>
            <option value="done">Completed</option>
            <option value="">All</option>
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--warm-300)] pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[var(--warm-50)] rounded-xl shimmer" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <EmptyState
            icon={<CheckSquare size={24} />}
            title={statusFilter === 'open' ? "You're all caught up" : 'No tasks'}
            description={statusFilter === 'open' ? 'No open tasks right now — nice work!' : 'Tasks will appear as opportunities progress through the pipeline'}
            tip="Press G then T from anywhere to jump to tasks"
          />
        </div>
      ) : (
        <TaskSections sections={sections} updateTask={updateTask} />
      )}
    </div>
  )
}

// ─── Sortable task sections ──────────────────────────────────────────────────

interface TaskSection {
  label: string
  tasks: ReturnType<typeof useTasks>['data'] extends (infer T)[] | undefined ? T[] : never
  color: string
  accent: string
}

function TaskSections({ sections, updateTask }: { sections: TaskSection[]; updateTask: ReturnType<typeof useUpdateTask> }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const allTasks = sections.flatMap(s => s.tasks)
  const activeTask = activeId ? allTasks.find(t => t.id === activeId) : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null)
    // Visual reorder only — no backend persistence for task order
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${section.accent}`} />
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${section.color}`}>
                {section.label}
              </h3>
              <span className="text-[10px] text-[var(--warm-300)] bg-[var(--warm-50)] px-1.5 py-0.5 rounded-full">
                {section.tasks.length}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-[var(--warm-100)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-[var(--warm-50)] overflow-hidden card-hover-border">
              <SortableContext items={section.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {section.tasks.map((task) => (
                  <SortableTaskRow key={task.id} task={task} updateTask={updateTask} />
                ))}
              </SortableContext>
            </div>
          </div>
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="pipeline-drag-overlay bg-white rounded-xl border border-[var(--green-500)]/30 px-5 py-3.5 shadow-xl">
            <div className="flex items-center gap-3">
              <GripVertical size={14} className="text-[var(--warm-300)]" />
              <p className="text-sm text-[var(--warm-800)]">{activeTask.type.replace(/_/g, ' ')}</p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function SortableTaskRow({ task, updateTask }: { task: { id: string; type: string; description: string | null; status: string; due_at: string | null }; updateTask: ReturnType<typeof useUpdateTask> }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isOverdue = task.status === 'open' && task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))
  const isDone = task.status === 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative flex items-center gap-3 px-5 py-3.5 group hover:bg-[var(--warm-50)]/50 transition-colors"
    >
      {/* Priority accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isOverdue ? 'bg-red-400' : isDone ? 'bg-emerald-400' : 'bg-transparent'}`} />

      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="p-0.5 text-[var(--warm-200)] hover:text-[var(--warm-400)] cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <GripVertical size={14} />
      </button>

      {/* Checkbox */}
      <button
        onClick={() => updateTask.mutate({ id: task.id, status: task.status === 'open' ? 'done' : 'open' })}
        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          isDone
            ? 'bg-[var(--green-600)] border-[var(--green-600)] text-white animate-check'
            : 'border-[var(--warm-300)] hover:border-[var(--green-500)] hover:bg-[var(--green-50)]'
        }`}
      >
        {isDone && <Check size={10} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'text-[var(--warm-400)] line-through' : 'text-[var(--warm-800)]'}`}>
          {task.type.replace(/_/g, ' ')}
        </p>
        {task.description && (
          <p className="text-xs text-[var(--warm-400)] truncate mt-0.5">{task.description}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isOverdue && <AlertTriangle size={12} className="text-red-400" />}
        {task.due_at && (
          <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-[var(--warm-400)]'}`}>
            {format(new Date(task.due_at), 'dd MMM')}
          </span>
        )}
      </div>
    </div>
  )
}
