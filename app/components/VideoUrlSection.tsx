"use client";

import { useState } from "react";
import type { AboutVideo, HomeVideo } from "@/lib/siteData";
import { getYouTubeId } from "@/lib/youtube";
import { SortableItemList } from "./SortableItemList";
import { EditModal } from "./EditModal";
import { v4 as uuidv4 } from "uuid";

type Item = HomeVideo | AboutVideo;

export function VideoUrlSection({
  title,
  description,
  items,
  onChange,
}: {
  title: string;
  description?: string;
  items: Item[];
  onChange: (items: Item[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const editingItem = editIndex !== null ? items[editIndex] : null;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? (
          <p className="text-sm text-gray-500">{description}</p>
        ) : null}
      </div>
      <SortableItemList
        items={items}
        onReorder={onChange}
        renderDragOverlay={(item) => <VideoUrlDragPreview item={item} />}
        isDragDisabled={(_, index) => editIndex === index}
      >
        {(item, index) => (
          <VideoUrlCard
            item={item}
            onExpand={() => setEditIndex(index)}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        )}
      </SortableItemList>
      <button
        type="button"
        onClick={() => onChange([...items, { id: uuidv4(), url: "" }])}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        + 新增項目
      </button>

      <EditModal
        open={editingItem !== null}
        title="展開修改"
        onClose={() => setEditIndex(null)}
      >
        {editingItem !== null && editIndex !== null ? (
          <VideoUrlEditForm
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

function VideoUrlDragPreview({ item }: { item: Item }) {
  const thumb = item.url ? getYouTubeId(item.url) : null;
  return (
    <div className="min-w-0">
      {thumb ? (
        <img
          src={`https://img.youtube.com/vi/${thumb}/mqdefault.jpg`}
          alt=""
          className="mb-2 w-full rounded-lg object-cover"
        />
      ) : (
        <p className="text-xs text-gray-400">影片</p>
      )}
      <p className="line-clamp-2 text-sm font-medium text-gray-800">
        {item.url ? item.url.slice(0, 48) : "（無網址）"}
        {(item.url?.length ?? 0) > 48 ? "…" : ""}
      </p>
    </div>
  );
}

function VideoUrlCard({
  item,
  onExpand,
  onRemove,
}: {
  item: Item;
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
        <p className="line-clamp-2 break-all font-mono text-xs text-gray-600">
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

function VideoUrlEditForm({
  item,
  onChange,
  onSave,
}: {
  item: Item;
  onChange: (patch: Partial<Item>) => void;
  onSave: () => void;
}) {
  const thumb = item.url ? getYouTubeId(item.url) : null;
  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-500"
        readOnly
        value={item.id}
        title="id"
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
