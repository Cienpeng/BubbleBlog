import sql from '../connection';

export interface UserProfile {
  id: number;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  last_active_at: string;
  created_at: string;
  tags: { id: number; name: string; slug: string }[];
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const rows = await sql`
    SELECT id, username, display_name, bio, avatar_url, last_active_at, created_at
    FROM users WHERE id = ${userId}`;
  if (rows.length === 0) return null;

  const user = rows[0];

  // Get user tags
  const tags = await sql`
    SELECT t.id, t.name, t.slug
    FROM tags t
    JOIN user_tags ut ON ut.tag_id = t.id
    WHERE ut.user_id = ${userId}
    ORDER BY t.name`;

  return {
    id: Number(user.id),
    username: String(user.username),
    display_name: user.display_name == null ? null : String(user.display_name),
    bio: user.bio == null ? null : String(user.bio),
    avatar_url: user.avatar_url == null ? null : String(user.avatar_url),
    last_active_at: String(user.last_active_at),
    created_at: String(user.created_at),
    tags: tags.map(t => ({ id: t.id, name: t.name, slug: t.slug })),
  };
}

export async function updateUserProfile(
  userId: number,
  data: { display_name?: string; bio?: string; avatar_url?: string }
): Promise<void> {
  await sql`
    UPDATE users SET
      display_name = ${data.display_name ?? null},
      bio = ${data.bio ?? ''},
      avatar_url = ${data.avatar_url ?? ''}
    WHERE id = ${userId}
  `;
}

export async function setUserTags(userId: number, tagIds: number[]): Promise<void> {
  await sql`DELETE FROM user_tags WHERE user_id = ${userId}`;
  if (tagIds.length > 0) {
    const rows = tagIds.map(tid => ({ user_id: userId, tag_id: tid }));
    await sql`INSERT INTO user_tags ${sql(rows, 'user_id', 'tag_id')}`;
  }
}

export async function updatePassword(
  userId: number,
  newPasswordHash: string
): Promise<void> {
  await sql`UPDATE users SET password_hash = ${newPasswordHash} WHERE id = ${userId}`;
}
