import sql from '../connection';

export interface CarouselImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export async function getCarouselForArticle(slug: string): Promise<CarouselImage[]> {
  // First try article-specific carousel
  const articleRows = await sql`SELECT id FROM articles WHERE slug = ${slug}`;
  if (articleRows.length > 0) {
    const customRows = await sql`
      SELECT id, image_url, sort_order
      FROM carousel_images
      WHERE article_id = ${articleRows[0].id}
      ORDER BY sort_order`;

    if (customRows.length > 0) {
      return customRows as CarouselImage[];
    }
  }

  // Fall back to default wallpapers
  const defaultRows = await sql`
    SELECT id, image_url, sort_order
    FROM carousel_images
    WHERE is_default = true
    ORDER BY sort_order`;

  return defaultRows as CarouselImage[];
}

export async function addCarouselImage(articleId: number, imageUrl: string, sortOrder: number = 0): Promise<CarouselImage> {
  const rows = await sql`
    INSERT INTO carousel_images (article_id, image_url, sort_order)
    VALUES (${articleId}, ${imageUrl}, ${sortOrder})
    RETURNING id, image_url, sort_order`;
  return rows[0] as CarouselImage;
}

export async function deleteCarouselImage(id: number): Promise<boolean> {
  const result = await sql`DELETE FROM carousel_images WHERE id = ${id}`;
  return result.count > 0;
}
