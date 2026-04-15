"use client";

import { Fragment, useMemo, useState } from "react";
import {
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ProfiloCategory, ProfiloItem } from "@/lib/siteData";
import { sortProfiloCategories } from "@/lib/siteData";
import { getYouTubeId } from "@/lib/youtube";
import { v4 as uuidv4 } from "uuid";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { EditModal } from "./EditModal";
import { DropInsertionSlot } from "./SortableItemList";

const COLUMN_DOT: Record<string, string> = {
  COMMERCIAL: "bg-red-500",
  TELEVISION: "bg-orange-500",
  "MUSIC VIDEO": "bg-teal-500",
  OTHER: "bg-green-500",
};

function dotClass(name: string) {
  return COLUMN_DOT[name] ?? "bg-gray-400";
}

function findCategoryForItem(
  profilo: ProfiloCategory[],
  itemId: string
): string | null {
  for (const c of profilo) {
    if (c.profilo.some((i) => i.id === itemId)) return c.name;
  }
  return null;
}

function columnFromDroppableId(overId: string): string | null {
  if (!overId.startsWith("column:")) return null;
  return overId.slice("column:".length);
}

const emptyProfiloForm = (): ProfiloItem => ({
  id: "",
  title: "",
  url: "",
  author: "",
  date: new Date().getFullYear(),
  chinese_title: "",
});

type ProfiloBoardProps = {
  profilo: ProfiloCategory[];
  onChange: (next: ProfiloCategory[]) => void;
};

export function ProfiloBoard({ profilo, onChange }: ProfiloBoardProps) {
  const ordered = useMemo(
    () => sortProfiloCategories(profilo),
    [profilo]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [newCard, setNewCard] = useState(emptyProfiloForm);
  const [editOpen, setEditOpen] = useState<{
    categoryName: string;
    itemId: string;
  } | null>(null);
  const [editForm, setEditForm] = useState<ProfiloItem>(emptyProfiloForm());

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const c of ordered) {
      const it = c.profilo.find((i) => i.id === activeId);
      if (it) return it;
    }
    return null;
  }, [activeId, ordered]);

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
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    if (activeIdStr === overIdStr) return;

    onChange((() => {
      const next = structuredClone(sortProfiloCategories(profilo));
      const activeCat = findCategoryForItem(next, activeIdStr);
      if (!activeCat) return next;

      let overCat = findCategoryForItem(next, overIdStr);
      if (!overCat) overCat = columnFromDroppableId(overIdStr);
      if (!overCat) return next;

      const fromIx = next.findIndex((c) => c.name === activeCat);
      const toIx = next.findIndex((c) => c.name === overCat);
      if (fromIx === -1 || toIx === -1) return next;

      if (activeCat === overCat) {
        const list = [...next[fromIx].profilo];
        const oldIndex = list.findIndex((i) => i.id === activeIdStr);
        let newIndex: number;
        if (overIdStr.startsWith("column:")) {
          newIndex = Math.max(0, list.length - 1);
        } else {
          newIndex = list.findIndex((i) => i.id === overIdStr);
        }
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return next;
        }
        next[fromIx].profilo = arrayMove(list, oldIndex, newIndex);
        return next;
      }

      const fromList = [...next[fromIx].profilo];
      const itemIndex = fromList.findIndex((i) => i.id === activeIdStr);
      if (itemIndex === -1) return next;
      const [moved] = fromList.splice(itemIndex, 1);
      next[fromIx].profilo = fromList;

      const toList = [...next[toIx].profilo];
      let insertAt: number;
      if (overIdStr.startsWith("column:")) {
        insertAt = toList.length;
      } else {
        insertAt = toList.findIndex((i) => i.id === overIdStr);
        if (insertAt < 0) insertAt = toList.length;
      }
      toList.splice(insertAt, 0, moved);
      next[toIx].profilo = toList;
      return next;
    })());
  }

  function startAdd(col: string) {
    setAddingCol(col);
    setNewCard({
      ...emptyProfiloForm(),
      id: uuidv4(),
      date: new Date().getFullYear(),
    });
  }

  function confirmAdd(col: string) {
    if (!newCard.title.trim() || !newCard.url.trim()) return;
    const item: ProfiloItem = {
      id: newCard.id || uuidv4(),
      title: newCard.title.trim(),
      url: newCard.url.trim(),
      author: newCard.author.trim(),
      date: Number(newCard.date) || new Date().getFullYear(),
      ...(newCard.chinese_title?.trim()
        ? { chinese_title: newCard.chinese_title.trim() }
        : {}),
    };
    const next = structuredClone(sortProfiloCategories(profilo));
    const ix = next.findIndex((c) => c.name === col);
    if (ix === -1) return;
    next[ix].profilo = [...next[ix].profilo, item];
    onChange(next);
    setAddingCol(null);
    setNewCard(emptyProfiloForm());
  }

  function removeItem(categoryName: string, itemId: string) {
    const next = structuredClone(sortProfiloCategories(profilo));
    const ix = next.findIndex((c) => c.name === categoryName);
    if (ix === -1) return;
    next[ix].profilo = next[ix].profilo.filter((i) => i.id !== itemId);
    onChange(next);
    if (editOpen?.itemId === itemId) setEditOpen(null);
  }

  function openEdit(categoryName: string, item: ProfiloItem) {
    setEditOpen({ categoryName, itemId: item.id });
    setEditForm({ ...item, chinese_title: item.chinese_title ?? "" });
  }

  function saveEdit() {
    if (!editOpen) return;
    const { categoryName, itemId } = editOpen;
    if (!editForm.title.trim() || !editForm.url.trim()) return;
    const next = structuredClone(sortProfiloCategories(profilo));
    const cix = next.findIndex((c) => c.name === categoryName);
    if (cix === -1) return;
    const iix = next[cix].profilo.findIndex((i) => i.id === itemId);
    if (iix === -1) return;
    next[cix].profilo[iix] = {
      id: itemId,
      title: editForm.title.trim(),
      url: editForm.url.trim(),
      author: editForm.author.trim(),
      date: Number(editForm.date) || new Date().getFullYear(),
      ...(editForm.chinese_title?.trim()
        ? { chinese_title: editForm.chinese_title.trim() }
        : {}),
    };
    onChange(next);
    setEditOpen(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      modifiers={[snapCenterToCursor]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd}
    >
      <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {ordered.map((col) => (
          <ProfiloColumn
            key={col.name}
            category={col}
            dotClassName={dotClass(col.name)}
            activeDragId={activeId}
            dropOverId={overId}
            addingCol={addingCol}
            newCard={newCard}
            setNewCard={setNewCard}
            editingItemId={editOpen?.itemId ?? null}
            onStartAdd={() => startAdd(col.name)}
            onCancelAdd={() => setAddingCol(null)}
            onConfirmAdd={() => confirmAdd(col.name)}
            onOpenEdit={(item) => openEdit(col.name, item)}
            onRemove={(id) => removeItem(col.name, id)}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="w-[min(calc(100vw-2rem),20rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl">
            <p className="text-sm font-medium line-clamp-3">{activeItem.title}</p>
          </div>
        ) : null}
      </DragOverlay>

      <EditModal
        open={!!editOpen}
        title="展開修改 — Profilo"
        onClose={() => setEditOpen(null)}
      >
        <div className="space-y-3">
          <ProfiloFields value={editForm} onChange={setEditForm} showId />
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={saveEdit}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              儲存
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(null)}
              className="flex-1 rounded-lg bg-gray-100 py-2 text-sm hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      </EditModal>
    </DndContext>
  );
}

type ProfiloColumnProps = {
  category: ProfiloCategory;
  dotClassName: string;
  activeDragId: string | null;
  dropOverId: string | null;
  addingCol: string | null;
  newCard: ProfiloItem;
  setNewCard: (v: ProfiloItem) => void;
  editingItemId: string | null;
  onStartAdd: () => void;
  onCancelAdd: () => void;
  onConfirmAdd: () => void;
  onOpenEdit: (item: ProfiloItem) => void;
  onRemove: (id: string) => void;
};

function ProfiloColumn({
  category,
  dotClassName,
  activeDragId,
  dropOverId,
  addingCol,
  newCard,
  setNewCard,
  editingItemId,
  onStartAdd,
  onCancelAdd,
  onConfirmAdd,
  onOpenEdit,
  onRemove,
}: ProfiloColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column:${category.name}`,
  });
  const items = category.profilo.map((i) => i.id);

  return (
    <div
      ref={setNodeRef}
      className={`flex max-h-[50vh] min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-4 ${
        isOver ? "ring-2 ring-blue-400 ring-offset-2" : ""
      }`}
    >
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
          {category.name}
        </h3>
        <span className="text-xs text-gray-400">{category.profilo.length}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col space-y-3 pr-1">
            {category.profilo.map((item) => {
              const showInsertionSlot =
                !!activeDragId &&
                !!dropOverId &&
                activeDragId !== dropOverId &&
                dropOverId === item.id;
              return (
                <Fragment key={item.id}>
                  {showInsertionSlot ? <DropInsertionSlot /> : null}
                  <SortableProfiloCard
                    item={item}
                    isModalOpen={editingItemId === item.id}
                    onOpenEdit={() => onOpenEdit(item)}
                    onRemove={() => onRemove(item.id)}
                  />
                </Fragment>
              );
            })}
          </div>
        </SortableContext>
      </div>

      {addingCol === category.name ? (
        <div className="mt-3 shrink-0 space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <ProfiloFields
            value={newCard}
            onChange={setNewCard}
            showId={false}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onConfirmAdd}
              className="flex-1 rounded-lg bg-blue-600 py-2 text-sm text-white hover:bg-blue-700"
            >
              新增
            </button>
            <button
              type="button"
              onClick={onCancelAdd}
              className="flex-1 rounded-lg bg-gray-100 py-2 text-sm hover:bg-gray-200"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartAdd}
          className="mt-3 shrink-0 self-start text-sm text-gray-500 hover:text-gray-800"
        >
          + 新增卡片
        </button>
      )}
    </div>
  );
}

function SortableProfiloCard({
  item,
  isModalOpen,
  onOpenEdit,
  onRemove,
}: {
  item: ProfiloItem;
  isModalOpen: boolean;
  onOpenEdit: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isModalOpen });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };
  const thumb = getYouTubeId(item.url);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${
        isModalOpen
          ? ""
          : "cursor-grab touch-manipulation select-none active:cursor-grabbing"
      }`}
      {...(!isModalOpen ? { ...attributes, ...listeners } : {})}
    >
      <div className="min-w-0">
        {thumb ? (
          <img
            src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
            alt=""
            draggable={false}
            className="mb-2 w-full rounded-lg object-cover"
          />
        ) : null}
        <div className="text-sm font-medium">{item.title}</div>
        {item.chinese_title ? (
          <div className="mt-1 text-xs text-gray-600">{item.chinese_title}</div>
        ) : null}
        <div className="mt-1 text-xs text-gray-500">
          {item.author} · {item.date}
        </div>
      </div>
      <div className="mt-2 flex justify-between gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onOpenEdit}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          展開修改
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onRemove}
          className="text-xs text-red-600 hover:underline"
        >
          刪除
        </button>
      </div>
    </div>
  );
}

function ProfiloFields({
  value,
  onChange,
  showId,
}: {
  value: ProfiloItem;
  onChange: (v: ProfiloItem) => void;
  showId: boolean;
}) {
  return (
    <>
      {showId ? (
        <input
          className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-500"
          readOnly
          value={value.id}
          title="id"
        />
      ) : null}
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="title"
        value={value.title}
        onChange={(e) => onChange({ ...value, title: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="chinese_title（選填）"
        value={value.chinese_title ?? ""}
        onChange={(e) =>
          onChange({ ...value, chinese_title: e.target.value })
        }
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="url"
        value={value.url}
        onChange={(e) => onChange({ ...value, url: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="author"
        value={value.author}
        onChange={(e) => onChange({ ...value, author: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="date（年份）"
        type="number"
        value={value.date}
        onChange={(e) =>
          onChange({ ...value, date: Number(e.target.value) || 0 })
        }
      />
    </>
  );
}
