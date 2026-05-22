"use client"

import { CSS } from "@dnd-kit/utilities"
import { useSortable } from "@dnd-kit/sortable"

export function SortableCategoriaWrapper({
  id,
  children,
}: {
  id: string
  children: (props: { dragHandleProps: Record<string, unknown> }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

export function SortableItemWrapper({
  id,
  children,
}: {
  id: string
  children: (props: { dragHandleProps: Record<string, unknown>; isDragging: boolean }) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {children({ dragHandleProps: { ...attributes, ...listeners }, isDragging })}
    </div>
  )
}
