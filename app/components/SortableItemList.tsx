"use client";

import { Fragment, useState, type ReactNode } from "react";
import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { snapCenterToCursor } from "@dnd-kit/modifiers";

type SortableItemListProps<T extends { id: string }> = {
  items: T[];
  onReorder: (items: T[]) => void;
  children: (item: T, index: number) => ReactNode;
  /** Optional preview while dragging (e.g. thumbnail + title). */
  renderDragOverlay?: (item: T) => ReactNode;
  /** Per-item: disable drag (e.g. while a modal is open for that row). */
  isDragDisabled?: (item: T, index: number) => boolean;
};

export function SortableItemList<T extends { id: string }>({
  items,
  onReorder,
  children,
  renderDragOverlay,
  isDragDisabled,
}: SortableItemListProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const activeItem = activeId
    ? items.find((i) => i.id === activeId) ?? null
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    setOverId(null);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveId(null);
    setOverId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[snapCenterToCursor]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-3">
          {items.map((item, index) => {
            const showInsertionSlot =
              !!activeId &&
              !!overId &&
              activeId !== overId &&
              overId === item.id;
            return (
              <Fragment key={item.id}>
                {showInsertionSlot ? <DropInsertionSlot /> : null}
                <SortableRow
                  id={item.id}
                  disabled={isDragDisabled?.(item, index) ?? false}
                >
                  {children(item, index)}
                </SortableRow>
              </Fragment>
            );
          })}
        </div>
      </SortableContext>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-[min(calc(100vw-2rem),28rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl">
            {renderDragOverlay ? (
              renderDragOverlay(activeItem)
            ) : (
              <p className="text-sm text-gray-500">拖曳中…</p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** Dashed placeholder: shows where the card will land (above the hovered row). */
export function DropInsertionSlot() {
  return (
    <div
      className="pointer-events-none min-h-[5.5rem] w-full rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/50 shadow-inner"
      aria-hidden
    />
  );
}

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        disabled
          ? "rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
          : "cursor-grab touch-manipulation select-none rounded-xl border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing"
      }
      {...(!disabled ? { ...attributes, ...listeners } : {})}
    >
      {children}
    </div>
  );
}
