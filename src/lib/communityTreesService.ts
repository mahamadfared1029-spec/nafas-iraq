import { getSupabaseClient, isSupabaseConfigured } from './supabase/client';

export type CommunityTreeType = 'palm' | 'sidr' | 'oak' | 'orange';

export interface CommunityTree {
  id: string;
  userId: string;
  authorName: string;
  governorateId: string;
  treeType: CommunityTreeType;
  message: string;
  isAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertCommunityTreeInput {
  userId?: string | null;
  isAdmin?: boolean;
  authorName: string;
  governorateId: string;
  treeType: CommunityTreeType;
  message: string;
}

export const COMMUNITY_TREE_TYPES: {
  id: CommunityTreeType;
  labelAr: string;
  subtitleAr: string;
  emoji: string;
}[] = [
  {
    id: 'palm',
    labelAr: 'نخلة عراقية',
    subtitleAr: 'رمز الصمود والعطاء في أرض السواد',
    emoji: '🌴',
  },
  {
    id: 'sidr',
    labelAr: 'سدر عراقي',
    subtitleAr: 'شجرة الظل والندى المقاومة للحر',
    emoji: '🌳',
  },
  {
    id: 'oak',
    labelAr: 'بلوط كوردستان',
    subtitleAr: 'حارس الجبال والينابيع الشمالية',
    emoji: '🌲',
  },
  {
    id: 'orange',
    labelAr: 'نارنج بغدادي',
    subtitleAr: 'عبق البساتين والقداح في دجلة والفرات',
    emoji: '🍊',
  },
];

const LOCAL_TREES_KEY = 'nafas_community_trees_v1';
const LOCAL_DEVICE_UID_KEY = 'nafas_community_tree_device_uid_v1';

function getOrCreateDeviceUserId(): string {
  if (typeof window === 'undefined') return 'local-user';
  try {
    const existing = window.localStorage.getItem(LOCAL_DEVICE_UID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.localStorage.setItem(LOCAL_DEVICE_UID_KEY, generated);
    return generated;
  } catch {
    return 'local-user';
  }
}

function readLocalTrees(): CommunityTree[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_TREES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTrees(trees: CommunityTree[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_TREES_KEY, JSON.stringify(trees));
  } catch {
    // ignore storage quota errors
  }
}

function mapSupabaseRow(row: any): CommunityTree {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    authorName: String(row.author_name || '').slice(0, 40),
    governorateId: String(row.governorate_id || 'baghdad'),
    treeType: (['palm', 'sidr', 'oak', 'orange'].includes(row.tree_type)
      ? row.tree_type
      : 'palm') as CommunityTreeType,
    message: String(row.message || '').slice(0, 120),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
  };
}

export const communityTreesService = {
  getCurrentActorId(authUserId?: string | null): string {
    return authUserId || getOrCreateDeviceUserId();
  },

  async listTrees(): Promise<CommunityTree[]> {
    const local = readLocalTrees();

    if (!isSupabaseConfigured()) {
      return local;
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('community_trees')
        .select('id, user_id, author_name, governorate_id, tree_type, message, created_at, updated_at')
        .order('created_at', { ascending: true })
        .limit(1000);

      if (error || !data) {
        return local;
      }

      const remoteTrees = data.map(mapSupabaseRow);
      // Merge any unsynced local trees so the user never loses their local tree
      const remoteByUser = new Set(remoteTrees.map((t) => t.userId));
      const merged = [...remoteTrees, ...local.filter((t) => !remoteByUser.has(t.userId))];
      return merged;
    } catch {
      return local;
    }
  },

  async upsertTree(input: UpsertCommunityTreeInput): Promise<{ tree: CommunityTree; source: 'supabase' | 'local' }> {
    const cleanName = input.authorName.trim().slice(0, 40);
    const cleanMessage = input.message.trim().slice(0, 120);
    if (!cleanName) throw new Error('يرجى كتابة الاسم.');
    if (!cleanMessage) throw new Error('يرجى كتابة رسالة قصيرة على الشجرة.');

    const actorId = this.getCurrentActorId(input.userId);
    const now = new Date().toISOString();

    if (isSupabaseConfigured() && input.userId) {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id === input.userId) {
          const { data, error } = await supabase
            .from('community_trees')
            .upsert(
              {
                user_id: input.userId,
                author_name: cleanName,
                governorate_id: input.governorateId,
                tree_type: input.treeType,
                message: cleanMessage,
                updated_at: now,
              },
              { onConflict: 'user_id' }
            )
            .select('id, user_id, author_name, governorate_id, tree_type, message, created_at, updated_at')
            .single();

          if (!error && data) {
            const tree = mapSupabaseRow(data);
            return { tree, source: 'supabase' };
          }
        }
      } catch {
        // Fallback to localStorage below
      }
    }

    // Local fallback (enforces 1 tree per user/device)
    const existing = readLocalTrees();
    const idx = existing.findIndex((t) => t.userId === actorId);
    const tree: CommunityTree =
      idx >= 0
        ? {
            ...existing[idx],
            authorName: cleanName,
            governorateId: input.governorateId,
            treeType: input.treeType,
            message: cleanMessage,
            isAdmin: Boolean(input.isAdmin || existing[idx].isAdmin),
            updatedAt: now,
          }
        : {
            id:
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `tree-${Date.now()}`,
            userId: actorId,
            authorName: cleanName,
            governorateId: input.governorateId,
            treeType: input.treeType,
            message: cleanMessage,
            isAdmin: Boolean(input.isAdmin),
            createdAt: now,
            updatedAt: now,
          };

    const next = idx >= 0 ? existing.map((t, i) => (i === idx ? tree : t)) : [...existing, tree];
    writeLocalTrees(next);
    return { tree, source: 'local' };
  },
};
