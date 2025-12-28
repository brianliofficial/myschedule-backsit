
import { createClient } from '@supabase/supabase-js'
import { debug, profile } from 'console';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_KEY. Add them to .env.local and restart the dev server.')
}
const supabase = createClient(supabaseUrl, supabaseKey)

// export default supabase;
export type ProfileVideo = {
  id?: string;
  project_id: string;
  title: string;
  url: string;
  author: string;
  date: number;
  profile_order: number;
  type: string;
};

/* READ */
export const getProfileVideos = async () => {
  const { data, error } = await supabase
    .from("profile_videos")
    .select("*")
    .order("type")
    .order("profile_order");

  if (error) throw error;
  return data;
};

/* UPSERT (bulk) */
export const upsertProfileVideos = async (insertData: ProfileVideo[]) => {
  const { data, error } = await supabase
    .from("profile_videos")
    .upsert(insertData)
    .select();

  if (error) throw error;
  return data;
};

/* DELETE */
export const deleteProfileVideo = async (id: string) => {
    debugger;
  const { data,error } = await supabase
    .from("profile_videos")
    .delete()
    .eq("id", id).select();

  if (error) throw error;
};