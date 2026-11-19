import { myUserId } from "./account";
import { requireSupabase } from "./client";
import type { FriendshipRow, PublicProfile } from "./types";

/** How the signed-in person relates to someone else. */
export type Relation = "self" | "none" | "requested" | "incoming" | "friends";

export type FriendsOverview = {
  friends: PublicProfile[];
  incoming: PublicProfile[];
  outgoing: PublicProfile[];
};

/** LIKE treats _ and % as wildcards; usernames can contain _, so escape them. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

export async function searchProfiles(query: string): Promise<PublicProfile[]> {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) return [];
  const sb = requireSupabase();
  const me = myUserId();
  let req = sb.from("profiles").select("*").ilike("username", `${likeEscape(q)}%`).order("username").limit(20);
  if (me) req = req.neq("id", me);
  const { data, error } = await req;
  if (error) throw new Error(`Search failed (${error.message}).`);
  return (data ?? []) as PublicProfile[];
}

export async function fetchProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data, error } = await requireSupabase()
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Couldn't load this profile (${error.message}).`);
  return (data as PublicProfile | null) ?? null;
}

/** Your friendships (the database only returns ones you're part of). */
async function myFriendships(): Promise<FriendshipRow[]> {
  const { data, error } = await requireSupabase().from("friendships").select("*");
  if (error) throw new Error(`Couldn't load friends (${error.message}).`);
  return (data ?? []) as FriendshipRow[];
}

export function relationFrom(rows: FriendshipRow[], me: string | null, other: string): Relation {
  if (!me) return "none";
  if (me === other) return "self";
  const row = rows.find(
    (r) => (r.requester_id === me && r.addressee_id === other) || (r.requester_id === other && r.addressee_id === me),
  );
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  return row.requester_id === me ? "requested" : "incoming";
}

export async function relationWith(otherId: string): Promise<Relation> {
  const me = myUserId();
  if (!me) return "none";
  return relationFrom(await myFriendships(), me, otherId);
}

export async function loadFriendsOverview(): Promise<FriendsOverview> {
  const me = myUserId();
  if (!me) return { friends: [], incoming: [], outgoing: [] };
  const rows = await myFriendships();
  const otherIds = rows.map((r) => (r.requester_id === me ? r.addressee_id : r.requester_id));
  if (otherIds.length === 0) return { friends: [], incoming: [], outgoing: [] };

  const { data, error } = await requireSupabase().from("profiles").select("*").in("id", otherIds);
  if (error) throw new Error(`Couldn't load friends (${error.message}).`);
  const byId = new Map((data as PublicProfile[]).map((p) => [p.id, p]));

  const out: FriendsOverview = { friends: [], incoming: [], outgoing: [] };
  for (const r of rows) {
    const other = byId.get(r.requester_id === me ? r.addressee_id : r.requester_id);
    if (!other) continue;
    if (r.status === "accepted") out.friends.push(other);
    else if (r.requester_id === me) out.outgoing.push(other);
    else out.incoming.push(other);
  }
  out.friends.sort((a, b) => b.total_xp - a.total_xp);
  return out;
}

export async function sendFriendRequest(otherId: string) {
  const me = myUserId();
  if (!me) throw new Error("Sign in to add friends.");
  const { error } = await requireSupabase().from("friendships").insert({ requester_id: me, addressee_id: otherId });
  // 23505 = a request already exists between you (either direction); treat as done.
  if (error && error.code !== "23505") throw new Error(`Couldn't send the request (${error.message}).`);
}

export async function acceptFriendRequest(requesterId: string) {
  const me = myUserId();
  if (!me) throw new Error("Sign in first.");
  const { error } = await requireSupabase()
    .from("friendships")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("requester_id", requesterId)
    .eq("addressee_id", me);
  if (error) throw new Error(`Couldn't accept (${error.message}).`);
}

/** Unfriend, decline a request, or cancel one you sent. */
export async function removeFriendship(otherId: string) {
  const me = myUserId();
  if (!me) throw new Error("Sign in first.");
  const { error } = await requireSupabase()
    .from("friendships")
    .delete()
    .or(`and(requester_id.eq.${me},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me})`);
  if (error) throw new Error(`Couldn't update the friendship (${error.message}).`);
}
