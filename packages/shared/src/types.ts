/** Database row type — NEVER expose in API responses (contains password_hash) */
export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  last_active_at: string;
  created_at: string;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  content_md: string;
  content_html: string;
  excerpt: string | null;
  cover_image: string | null;
  status: 'draft' | 'published';
  reading_time: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleWithTags extends Article {
  tags: Tag[];
  prev_slug: string | null;
  next_slug: string | null;
}

export interface ArticleListItem {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  cover_image: string | null;
  reading_time: number;
  published_at: string | null;
  tags: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  article_count?: number;
}

export interface LikeInfo {
  count: number;
  liked: boolean;
}

export interface SearchResult {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  headline: string;
  published_at: string | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: string;
}

export interface LikeRequest {
  fingerprint: string;
}

export interface CreateArticleInput {
  title: string;
  content_md: string;
  tags?: string[];
  excerpt?: string;
  cover_image?: string;
  published_at?: string;
}

export interface UpdateArticleInput {
  title?: string;
  content_md?: string;
  tags?: string[];
  excerpt?: string;
  cover_image?: string;
}
