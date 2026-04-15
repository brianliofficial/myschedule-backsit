"use client";

import { useState } from "react";
import type { DrBeautyVideo } from "@/lib/siteData";
import { getYouTubeId } from "@/lib/youtube";
import { SortableItemList } from "./SortableItemList";
import { EditModal } from "./EditModal";
import { v4 as uuidv4 } from "uuid";

export function DrBeautySection({
  items,
  onChange,
}: {
  items: DrBeautyVideo[];
  onChange: (items: DrBeautyVideo[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const editingItem = editIndex !== null ? items[editIndex] : null;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">DR.BEAUTY（drBeautyVideos）</h3>
      <SortableItemList
        items={items}
        onReorder={onChange}
        renderDragOverlay={(item) => <DrBeautyDragPreview item={item} />}
        isDragDisabled={(_, index) => editIndex === index}
      >
        {(item, index) => (
          <DrBeautyCard
            item={item}
            onExpand={() => setEditIndex(index)}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        )}
      </SortableItemList>
      <button
        type="button"
        onClick={() =>
          onChange([...items, { id: uuidv4(), title: "", url: "" }])
        }
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        + 新增影片
      </button>

      <EditModal
        open={editingItem !== null}
        title="展開修改 — DR.BEAUTY"
        onClose={() => setEditIndex(null)}
      >
        {editingItem !== null && editIndex !== null ? (
          <DrBeautyEditForm
            item={editingItem}
            onChange={(patch) => {
              const next = [...items];
              next[editIndex] = { ...next[editIndex], ...patch };
              onChange(next);
            }}
            onSave={() => setEditIndex(null)}
          />
        ) : null}
      </EditModal>
    </section>
  );
}

function DrBeautyDragPreview({ item }: { item: DrBeautyVideo }) {
  const thumb = item.url ? getYouTubeId(item.url) : null;
  return (
    <div className="min-w-0">
      {thumb ? (
        <img
          src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
          alt=""
          className="mb-2 w-full rounded-lg object-cover"
        />
      ) : null}
      <p className="line-clamp-2 text-sm font-medium">{item.title || "影片"}</p>
    </div>
  );
}

function DrBeautyCard({
  item,
  onExpand,
  onRemove,
}: {
  item: DrBeautyVideo;
  onExpand: () => void;
  onRemove: () => void;
}) {
  const thumb = item.url ? getYouTubeId(item.url) : null;
  return (
    <div>
      <div className="min-w-0">
        {thumb ? (
          <img
            src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
            alt=""
            draggable={false}
            className="mb-2 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="mb-2 flex h-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
            無預覽
          </div>
        )}
        <div className="text-sm font-medium">{item.title || "（未命名）"}</div>
        <p className="mt-1 line-clamp-2 break-all text-xs text-gray-500">
          {item.url || "（未填網址）"}
        </p>
      </div>
      <div className="mt-2 flex justify-between gap-2">
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onExpand}
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

function DrBeautyEditForm({
  item,
  onChange,
  onSave,
}: {
  item: DrBeautyVideo;
  onChange: (patch: Partial<DrBeautyVideo>) => void;
  onSave: () => void;
}) {
  const thumb = item.url ? getYouTubeId(item.url) : null;
  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-500"
        readOnly
        value={item.id}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="title"
        value={item.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="url"
        value={item.url}
        onChange={(e) => onChange({ url: e.target.value })}
      />
      {thumb ? (
        <img
          src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
          alt=""
          className="max-h-48 w-full rounded-lg object-cover"
        />
      ) : null}
      <button
        type="button"
        onClick={onSave}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        完成
      </button>
    </div>
  );
}
