'use client';

import { useEffect, useState, useRef, useMemo } from "react";
import {
  getProfileVideos,
  upsertProfileVideos,
  deleteProfileVideo
} from "./supabase";
import { v4 as uuidv4 } from "uuid";

type VideoCard = {
  id?: string;
  project_id: string;
  title: string;
  url: string;
  author: string;
  date: number;
  label: string;
  type: string;
  profile_order: number;
};

type Dragging = { col: string; index: number } | null;

const COLS = [
  { key: "TELEVISION", title: "TELEVISION", color: "bg-orange-500" },
  { key: "COMMERCIAL", title: "COMMERCIAL", color: "bg-red-500" },
  { key: "MUSIC", title: "MUSIC", color: "bg-teal-500" },
  { key: "OTHER", title: "OTHER", color: "bg-green-500" },
  { key: "DRBEAUTY", title: "DRBEAUTY", color: "bg-gray-500" },
  { key: "HOMEPAGE", title: "HOMEPAGE", color: "bg-purple-500" },
  { key: "ABOUTUS", title: "ABOUTUS", color: "bg-pink-500" },
  { key: "CONTACT", title: "CONTACT", color: "bg-yellow-500" },
];

const emptyForm = {
  title: "",
  url: "",
  author: "",
  label: "",
  date: new Date().getFullYear()
};

export default function KanbanBoard() {
  const [data, setData] = useState<Record<string, VideoCard[]>>({
    TELEVISION: [],
    COMMERCIAL: [],
    MUSIC: [],
    OTHER: [],
    DRBEAUTY: [],
    HOMEPAGE: [],
    ABOUTUS: [],
    CONTACT: []
  });
  const [addingCol, setAddingCol] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dragging, setDragging] = useState<Dragging>(null);
  const [dragOverItem, setDragOverItem] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ col: string; index: number } | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [status, setStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [selectedPage, setSelectedPage] = useState<'all'|'profile'|'drbeauty'|'contact'|'homepage'|'aboutus'>('all');
  const visibleCols = useMemo(() => {
    if (selectedPage === 'profile') {
      const allowed = new Set(['COMMERCIAL', 'TELEVISION', 'MUSIC', 'OTHER']);
      return COLS.filter((c) => allowed.has(c.key));
    }
    if (selectedPage === 'drbeauty') return COLS.filter((c) => c.key === 'DRBEAUTY');
    if (selectedPage === 'contact') return COLS.filter((c) => c.key === 'CONTACT');
    if (selectedPage === 'aboutus') return COLS.filter((c) => c.key === 'ABOUTUS');
    if (selectedPage === 'homepage') return COLS.filter((c) => c.key === 'HOMEPAGE');
    return COLS;
  }, [selectedPage]);
  
  // ----- Fetch initial data -----
  useEffect(() => {
    const fetch = async () => {
      try {
        const rows = await getProfileVideos();
        const grouped: Record<string, VideoCard[]> = {
          TELEVISION: [],
          COMMERCIAL: [],
          MUSIC: [],
          OTHER: [],
          DRBEAUTY: [],
          HOMEPAGE: [],
          ABOUTUS: [],  
          CONTACT: []
        };
        rows.forEach((r) => {
          const type = r.type ?? "OTHER";
          grouped[type].push({ ...r, profile_order: r.profile_order });
        });
        Object.keys(grouped).forEach((k) => {
          grouped[k].sort((a,b)=> a.profile_order - b.profile_order);
        });
        setData(grouped);
      } catch(e) {
        console.error("Fetch error:", e);
      }
    };
    fetch();
  }, []);

  // ----- Helpers -----
  const normalizeOrders = (list: VideoCard[]) =>
    list.map((item, i) => ({ ...item, profile_order: i }));

  const getYouTubeID = (url: string) => {
    const reg = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/;
    const match = url.match(reg);
    return match ? match[1] : null;
  };

  const debounce = (fn: Function, delay = 800) => {
    let timer: any;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedSave = useRef(
    debounce(async (nextData: typeof data) => {
      setStatus("saving");
      try {
        const insertData = COLS.flatMap((c) =>
          nextData[c.key].map((item) => {
            const base = {
              project_id: item.project_id,
              title: item.title,
              url: item.url,
              author: item.author,
              date: item.date,
              profile_order: item.profile_order,
              type: item.type
            };
            return item.id ? { id: item.id, ...base } : base;
          })
        );
        const res = await upsertProfileVideos(insertData);
        // update IDs for newly inserted cards
        const updatedRows: VideoCard[] = res;
        const newData: Record<string, VideoCard[]> = { ...nextData };
        updatedRows.forEach((r) => {
          const type = r.type ?? "OTHER";
          const index = newData[type].findIndex(c => c.project_id === r.project_id);
          if (index !== -1) {
            newData[type][index] = { ...r };
          }
        });
        setData(newData);
        setStatus("saved");
        setTimeout(()=>setStatus("idle"), 1200);
      } catch(e) {
        console.error("Save error:", e);
        setStatus("error");
      }
    }, 1000)
  ).current;

  // ----- Drag -----
  const onDrop = (targetCol: string) => {
    if (!dragging) return;
    const { col, index } = dragging;

    if (col === targetCol && dragOverItem !== null) {
      const list = [...data[col]];
      const [moved] = list.splice(index, 1);
      list.splice(dragOverItem, 0, moved);
      const nextData = { ...data, [col]: normalizeOrders(list) };
      setData(nextData);
      debouncedSave(nextData);
    }

    if (col !== targetCol) {
      const source = [...data[col]];
      const [moved] = source.splice(index, 1);
      const target = [...data[targetCol], { ...moved, type: targetCol }];
      const nextData = {
        ...data,
        [col]: normalizeOrders(source),
        [targetCol]: normalizeOrders(target)
      };
      setData(nextData);
      debouncedSave(nextData);
    }

    setDragging(null);
    setDragOverItem(null);
  };

  // ----- Add -----
  const addCard = async (col: string) => {
    if (!form.title) return;
    const newCard: VideoCard = {
      project_id: uuidv4(),
      title: form.title,
      url: form.url,
      label: form.label,
      author: form.author,
      date: form.date,
      type: col,
      profile_order: data[col].length
    };
    try {
      // 立即上傳拿回 id
      const [saved] = await upsertProfileVideos([newCard]);
      const nextData = {
        ...data,
        [col]: normalizeOrders([...data[col], saved])
      };
      setData(nextData);
      setForm(emptyForm);
      setAddingCol(null);
    } catch(e) {
      console.error("Add error:", e);
      alert("新增失敗");
    }
  };

  // ----- Delete -----
  const removeCard = async (col: string, index: number) => {
    const card = data[col][index];
    if (card.id) {
      try {
        await deleteProfileVideo(card.id);
      } catch(e) {
        console.error("Delete error:", e);
        alert("刪除失敗");
        return;
      }
    }
    const list = [...data[col]];
    list.splice(index, 1);
    const nextData = { ...data, [col]: normalizeOrders(list) };
    setData(nextData);
    debouncedSave(nextData);
  };

  // ----- Save All -----
  const saveAll = async () => {
    const insertData = COLS.flatMap((c) =>
      data[c.key].map((item) => {
        const base = {
          project_id: item.project_id,
          title: item.title,
          url: item.url,
          author: item.author,
          label: item.label,

          date: item.date,
          profile_order: item.profile_order,
          type: item.type
        };
        return item.id ? { id: item.id, ...base } : base;
      })
    );
    try {
      await upsertProfileVideos(insertData);
      alert("儲存完成");
    } catch(e) {
      console.error("Save all error:", e);
      alert("儲存失敗");
    }
  };
  // ----- Render -----
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
          我的檔期
        </h2>
        <select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value as 'all'|'profile'|'drbeauty'|'contact'|'homepage'|'aboutus')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value='all'>ALL</option>
          <option value='profile'>Profile</option>
          <option value='drbeauty'>DR.BEAUTY</option>
          <option value='contact'>Contact</option>
          <option value='homepage'>Homepage</option>
          <option value='aboutus'>About Us</option>
        </select>
        <div className="flex items-center gap-3">
          {status === "saving" && <span className="text-sm text-gray-500">Saving...</span>}
          {status === "saved" && <span className="text-sm text-green-500">Saved!</span>}
          {status === "error" && <span className="text-sm text-red-500">Error!</span>}
          <button
            onClick={saveAll}
            className="inline-flex items-center justify-center gap-2 px-4 py-2
              bg-blue-600 hover:bg-blue-700 text-white rounded-lg
              shadow-sm transition text-sm md:text-base"
          >
            💾 儲存全部
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {visibleCols.map((col) => (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.key)}
            className="bg-gray-50 rounded-2xl p-4 flex flex-col border border-gray-200 min-h-[320px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wide">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                {col.title}
              </h3>
              <span className="text-xs text-gray-400">{data[col.key].length}</span>
            </div>

            {/* Cards */}
            <div className="flex-1 space-y-3">
              {data[col.key].map((item, i) => (
                <div
                  key={item.id ?? i}
                  draggable
                  onDragStart={() => setDragging({ col: col.key, index: i })}
                  onDragOver={() => setDragOverItem(i)}
                  className={`relative group bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition cursor-move
                    ${dragging?.col === col.key && dragging?.index === i ? "opacity-50 scale-95" : ""}
                    ${dragOverItem === i && dragging?.col === col.key ? "ring-2 ring-blue-400" : ""}`}
                >
                  {/* Inline Edit */}
                  {editing?.col === col.key && editing?.index === i ? (
                    <div className="space-y-2">
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Title"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Label"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value || "" })}
                      />
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Date"
                        type="number"
                        value={editForm.date}
                        onChange={(e) => setEditForm({ ...editForm, date:  Number(e.target.value) })}
                      />
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="URL"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                      />
                      <input
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Author"
                        value={editForm.author}
                        onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      />
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            const list = [...data[col.key]];
                            list[i] = { ...list[i], ...editForm };
                            const nextData = { ...data, [col.key]: list };
                            setData(nextData);
                            setEditing(null);
                            debouncedSave(nextData);
                          }}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 rounded-lg"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-sm py-1.5 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center">
                        {item.url && getYouTubeID(item.url) && (
                          <div className="w-full">
                            <img
                              src={`https://img.youtube.com/vi/${getYouTubeID(item.url)}/0.jpg`}
                              alt="YouTube thumbnail"
                              className="mt-2 rounded-lg w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex flex-col flex-grow ml-3 w-70">
                          <div className="font-medium text-sm">{item.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.author} · {item.date}</div>
                        </div>
                      </div>
                      <div className="flex justify-between mt-2">
                        <button
                          onClick={() => {
                            setEditing({ col: col.key, index: i });
                            setEditForm(item);
                          }}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeCard(col.key, i)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add Card */}
            {addingCol === col.key ? (
              <div className="mt-4 bg-white rounded-xl p-4 shadow-md space-y-2">
                <input
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <input
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Label"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value || "" })}
                />
                <input
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Date"
                  type="number"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date:  Number(e.target.value) })}
                />
                <input
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="URL"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
                <input
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Author"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
                <div className="flex gap-2 pt-2">
                  <button onClick={() => addCard(col.key)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg">Confirm</button>
                  <button onClick={() => setAddingCol(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-sm py-2 rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingCol(col.key)}
                className="mt-4 text-sm text-gray-500 hover:text-gray-800 transition self-start"
              >
                + Add card
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
