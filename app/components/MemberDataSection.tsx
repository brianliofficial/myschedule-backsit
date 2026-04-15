"use client";

import { useState } from "react";
import type { MemberItem } from "@/lib/siteData";
import { SortableItemList } from "./SortableItemList";
import { EditModal } from "./EditModal";
import { v4 as uuidv4 } from "uuid";

export function MemberDataSection({
  items,
  onChange,
}: {
  items: MemberItem[];
  onChange: (items: MemberItem[]) => void;
}) {
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const editingItem = editIndex !== null ? items[editIndex] : null;

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold">Members（memberData）</h3>
      <SortableItemList
        items={items}
        onReorder={onChange}
        renderDragOverlay={(item) => (
          <div>
            <p className="line-clamp-2 text-sm font-medium">
              {item.title || "成員"}
            </p>
            <p className="text-xs text-gray-500">{item.jobPos}</p>
          </div>
        )}
        isDragDisabled={(_, index) => editIndex === index}
      >
        {(item, index) => (
          <MemberCard
            item={item}
            onExpand={() => setEditIndex(index)}
            onRemove={() => onChange(items.filter((_, i) => i !== index))}
          />
        )}
      </SortableItemList>
      <button
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              id: uuidv4(),
              title: "",
              member: "",
              jobPos: "",
            },
          ])
        }
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        + 新增成員
      </button>

      <EditModal
        open={editingItem !== null}
        title="展開修改 — Members"
        onClose={() => setEditIndex(null)}
      >
        {editingItem !== null && editIndex !== null ? (
          <MemberEditForm
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

function MemberCard({
  item,
  onExpand,
  onRemove,
}: {
  item: MemberItem;
  onExpand: () => void;
  onRemove: () => void;
}) {
  const src = item.member?.trim();
  const showImg =
    src &&
    (src.startsWith("/") ||
      src.startsWith("http://") ||
      src.startsWith("https://"));

  return (
    <div>
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-inset ring-gray-200/90">
          {showImg ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-gray-400">
              無圖
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{item.title || "（未命名）"}</div>
          {item.jobPos ? (
            <div className="mt-0.5 text-xs text-gray-500">{item.jobPos}</div>
          ) : null}
        </div>
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

function MemberEditForm({
  item,
  onChange,
  onSave,
}: {
  item: MemberItem;
  onChange: (patch: Partial<MemberItem>) => void;
  onSave: () => void;
}) {
  const previewSrc = item.member?.trim();
  const showPreview =
    previewSrc &&
    (previewSrc.startsWith("/") ||
      previewSrc.startsWith("http://") ||
      previewSrc.startsWith("https://"));

  return (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-xs text-gray-500"
        readOnly
        value={item.id}
      />
      <div className="flex justify-center">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-inset ring-gray-200/90">
          {showPreview ? (
            <img
              src={previewSrc}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-2 text-center text-xs text-gray-400">
              預覽
            </span>
          )}
        </div>
      </div>
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="title"
        value={item.title}
        onChange={(e) => onChange({ title: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="member（圖片路徑或 URL）"
        value={item.member ?? ""}
        onChange={(e) => onChange({ member: e.target.value })}
      />
      <input
        className="w-full rounded-lg border border-gray-200 p-2 text-sm"
        placeholder="jobPos（選填）"
        value={item.jobPos ?? ""}
        onChange={(e) => onChange({ jobPos: e.target.value })}
      />
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
