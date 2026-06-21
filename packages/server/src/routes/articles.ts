import { corsHeaders, handleCors } from '../middleware/cors';
import { requireAuth } from '../middleware/auth';
import {
  getPublishedArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  setArticleContentHtml,
  publishArticle,
  unpublishArticle,
  deleteArticle,
  getArticleById,
  getAllArticles,
} from '../db/queries/articles';
import { getOrCreateTags, setArticleTags } from '../db/queries/tags';
import { renderMarkdown } from '../markdown/renderer';
import { verifyToken } from '../services/jwt';
import { securityService } from '../services/security';

const ALLOWED_MD_EXTENSIONS = ['.md', '.markdown', '.txt'];

async function getUserId(req: Request): Promise<{ userId: number; username: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return verifyToken(authHeader.slice(7));
  } catch (e) {
    return null;
  }
}

export async function handleArticles(req: Request): Promise<Response> {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const url = new URL(req.url);

  // GET /api/articles — public list
  if (url.pathname === '/api/articles' && req.method === 'GET') {
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const tag = url.searchParams.get('tag') || undefined;
    const result = await getPublishedArticles(page, limit, tag);
    return Response.json({ success: true, data: result }, { headers: corsHeaders() });
  }

  // GET /api/articles/:slug — single article (must be BEFORE numeric ID routes)
  const slugMatch = url.pathname.match(/^\/api\/articles\/([a-zA-Z0-9一-鿿\-]+)$/);
  if (slugMatch && req.method === 'GET') {
    const article = await getArticleBySlug(slugMatch[1]);
    if (!article) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }
    return Response.json({ success: true, data: article }, { headers: corsHeaders() });
  }

  // ---- Protected routes below ----

  // GET /api/articles/admin/all
  if (url.pathname === '/api/articles/admin/all' && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;
    const articles = await getAllArticles();
    return Response.json(
      { success: true, data: articles, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // POST /api/articles/upload
  if (url.pathname === '/api/articles/upload' && req.method === 'POST') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const contentType = req.headers.get('Content-Type') || '';
    let markdown: string;
    let body: any = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return Response.json(
          { success: false, error: 'No file provided' },
          { status: 400, headers: corsHeaders() }
        );
      }

      const fileName = file.name.toLowerCase();
      if (!ALLOWED_MD_EXTENSIONS.some(ext => fileName.endsWith(ext))) {
        return Response.json(
          { success: false, error: 'Only .md files are allowed' },
          { status: 400, headers: corsHeaders() }
        );
      }

      if (file.size > 5 * 1024 * 1024) {
        return Response.json(
          { success: false, error: 'File too large (max 5MB)' },
          { status: 400, headers: corsHeaders() }
        );
      }

      markdown = await file.text();
    } else if (contentType.includes('application/json')) {
      body = await req.json();
      markdown = body.content_md || body.content || '';
      if (!markdown) {
        return Response.json(
          { success: false, error: 'No markdown content provided' },
          { status: 400, headers: corsHeaders() }
        );
      }
    } else {
      return Response.json(
        { success: false, error: 'Use multipart/form-data or application/json' },
        { status: 400, headers: corsHeaders() }
      );
    }

    const rendered = renderMarkdown(markdown);

    const article = await createArticle({
      title: rendered.title,
      content_md: markdown,
      excerpt: rendered.excerpt,
      cover_image: rendered.coverImage,
    });

    await setArticleContentHtml(article.id, rendered.html);

    // Tags from frontmatter
    if (rendered.tags.length > 0) {
      const tags = await getOrCreateTags(rendered.tags);
      await setArticleTags(article.id, tags.map(t => t.id));
      console.log(`[tags] Set ${tags.length} frontmatter tags for article ${article.id}:`, rendered.tags);
    }

    // Explicit tags (from editor UI, overrides frontmatter)
    if (Array.isArray(body.tags)) {
      const tagNames: string[] = body.tags.filter((t: any) => typeof t === 'string' && t.trim());
      console.log(`[tags] Explicit tags for article ${article.id}:`, tagNames);
      if (tagNames.length > 0) {
        const tags = await getOrCreateTags(tagNames);
        await setArticleTags(article.id, tags.map(t => t.id));
        console.log(`[tags] Saved ${tags.length} explicit tags for article ${article.id}`);
      } else if (body.tags.length === 0) {
        await setArticleTags(article.id, []);
        console.log(`[tags] Cleared all tags for article ${article.id}`);
      }
    } else {
      console.log(`[tags] body.tags is not an array:`, typeof body.tags, body.tags);
    }

    const created = await getArticleById(article.id);

    const userPayload = await getUserId(req);
    if (userPayload) {
      securityService.recordActivity(userPayload.userId, `新建并上传文章《${created?.title || '未命名'}》`, 'success');
    }

    return Response.json(
      { success: true, data: created, newToken: auth.newToken },
      { status: 201, headers: corsHeaders() }
    );
  }

  // GET /api/articles/:id/preview
  const previewMatch = url.pathname.match(/^\/api\/articles\/(\d+)\/preview$/);
  if (previewMatch && req.method === 'GET') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const article = await getArticleById(parseInt(previewMatch[1]));
    if (!article) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }
    return Response.json(
      { success: true, data: article, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // PUT /api/articles/:id/publish
  const publishMatch = url.pathname.match(/^\/api\/articles\/(\d+)\/publish$/);
  if (publishMatch && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const article = await publishArticle(parseInt(publishMatch[1]));
    if (!article) {
      return Response.json(
        { success: false, error: 'Article not found or not a draft' },
        { status: 404, headers: corsHeaders() }
      );
    }
    const userPayload = await getUserId(req);
    if (userPayload) {
      securityService.recordActivity(userPayload.userId, `公开发布文章《${article.title}》`, 'success');
    }

    return Response.json(
      { success: true, data: article, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // PUT /api/articles/:id/unpublish
  const unpublishMatch = url.pathname.match(/^\/api\/articles\/(\d+)\/unpublish$/);
  if (unpublishMatch && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const article = await unpublishArticle(parseInt(unpublishMatch[1]));
    if (!article) {
      return Response.json(
        { success: false, error: 'Article not found or not published' },
        { status: 404, headers: corsHeaders() }
      );
    }
    const userPayload = await getUserId(req);
    if (userPayload) {
      securityService.recordActivity(userPayload.userId, `撤回/下线文章《${article.title}》`, 'success');
    }

    return Response.json(
      { success: true, data: article, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // PUT /api/articles/:id — update
  const updateMatch = url.pathname.match(/^\/api\/articles\/(\d+)$/);
  if (updateMatch && req.method === 'PUT') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const body = await req.json();
    const id = parseInt(updateMatch[1]);

    if (body.content_md) {
      const rendered = renderMarkdown(body.content_md);
      body.content_html = rendered.html;
      // Tags from frontmatter
      if (rendered.tags && rendered.tags.length > 0) {
        const tags = await getOrCreateTags(rendered.tags);
        await setArticleTags(id, tags.map(t => t.id));
        console.log(`[tags] PUT frontmatter tags for ${id}:`, rendered.tags);
      }
    }

    // Explicit tags (from editor UI, overrides frontmatter)
    if (Array.isArray(body.tags)) {
      const tagNames: string[] = body.tags.filter((t: any) => typeof t === 'string' && t.trim());
      console.log(`[tags] PUT explicit for ${id}:`, tagNames);
      if (tagNames.length > 0) {
        const tags = await getOrCreateTags(tagNames);
        await setArticleTags(id, tags.map(t => t.id));
        console.log(`[tags] PUT saved ${tags.length} tags for ${id}`);
      } else if (body.tags.length === 0) {
        await setArticleTags(id, []);
        console.log(`[tags] PUT cleared tags for ${id}`);
      }
    } else {
      console.log(`[tags] PUT body.tags type:`, typeof body.tags, JSON.stringify(body.tags));
    }

    const article = await updateArticle(id, body);
    if (!article) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }

    if (body.content_html) {
      await setArticleContentHtml(id, body.content_html);
    }

    const updated = await getArticleById(id);

    const userPayload = await getUserId(req);
    if (userPayload) {
      securityService.recordActivity(userPayload.userId, `更新编辑文章《${updated?.title || '未命名'}》`, 'success');
    }

    return Response.json(
      { success: true, data: updated, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  // DELETE /api/articles/:id
  if (updateMatch && req.method === 'DELETE') {
    const auth = await requireAuth(req);
    if (!auth.authorized) return auth.response!;

    const deleted = await deleteArticle(parseInt(updateMatch[1]));
    if (!deleted) {
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders() });
    }
    const userPayload = await getUserId(req);
    if (userPayload) {
      securityService.recordActivity(userPayload.userId, `彻底删除文章 (ID: ${updateMatch[1]})`, 'success');
    }

    return Response.json(
      { success: true, data: { deleted: true }, newToken: auth.newToken },
      { headers: corsHeaders() }
    );
  }

  return Response.json(
    { success: false, error: 'Not found' },
    { status: 404, headers: corsHeaders() }
  );
}
