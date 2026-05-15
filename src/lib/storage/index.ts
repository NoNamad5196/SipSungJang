import { LocalRepository } from "./local";
// 나중에 클라우드로 전환할 때: import { SupabaseRepository } from "./supabase";

export const repository = new LocalRepository();

// 클라우드 전환 시 위 줄을 아래로 교체:
// export const repository = new SupabaseRepository(supabaseClient);
