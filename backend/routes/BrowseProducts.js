const express = require('express');
const router = express.Router();
const { ACTIVE_STORE_EXISTS_SQL } = require('../utils/storeVisibility');

let _productColumns = null;

async function getProductColumns(pool) {
  if (_productColumns) return _productColumns;
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'products'`
  );
  _productColumns = new Set(result.rows.map(r => r.column_name));
  return _productColumns;
}

async function getProductReviewSummary(pool, productId) {
  const summaryResult = await pool.query(
    `SELECT
      COUNT(*)::INTEGER AS total_reviews,
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating
     FROM reviews
     WHERE product_id = $1`,
    [productId]
  );
  return {
    total_reviews: Number(summaryResult.rows[0]?.total_reviews || 0),
    average_rating: Number(summaryResult.rows[0]?.average_rating || 0),
  };
}

function buildReviewerDisplayName(firstName, lastName) {
  const first = String(firstName || '').trim();
  const last = String(lastName || '').trim();
  if (!first && !last) return 'Anonymous';
  if (!last) return first;
  return `${first} ${last[0]}.`;
}


router.get('/', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const {
      search = '',
      category = '',
      minPrice = '',
      maxPrice = '',
      sort = 'newest',
      page = '1',
      limit = '12',
      store_id = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const cols = await getProductColumns(pool);
    const hasCategory = cols.has('category');
    const hasDescription = cols.has('description');
    const hasImages = cols.has('images');
    const hasImage = cols.has('image');
    const hasCreatedAt = cols.has('created_at');

    let whereConditions = ["p.status = 'Active'", ACTIVE_STORE_EXISTS_SQL];
    let queryParams = [];
    let paramIndex = 1;

    if (store_id && !isNaN(parseInt(store_id, 10))) {
      const requestedStoreId = parseInt(store_id, 10);
      const storeStatusResult = await pool.query(
        'SELECT status FROM stores WHERE store_id = $1 LIMIT 1',
        [requestedStoreId]
      );
      if (storeStatusResult.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }
      const requestedStoreStatus = String(storeStatusResult.rows[0].status || '');
      if (requestedStoreStatus !== 'Active') {
        return res.status(403).json({ error: 'Store unavailable', reason: 'INACTIVE' });
      }

      queryParams.push(requestedStoreId);
      whereConditions.push(`p.store_id = $${paramIndex}`);
      paramIndex++;
    }

    if (search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereConditions.push(`(p.product_name ILIKE $${paramIndex} OR p.title ILIKE $${paramIndex})`);
      paramIndex++;
    }

    if (hasCategory && category.trim()) {
      queryParams.push(category.trim());
      whereConditions.push(`p.category = $${paramIndex}`);
      paramIndex++;
    }

    if (minPrice && !isNaN(parseFloat(minPrice))) {
      queryParams.push(parseFloat(minPrice));
      whereConditions.push(`p.price >= $${paramIndex}`);
      paramIndex++;
    }

    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      queryParams.push(parseFloat(maxPrice));
      whereConditions.push(`p.price <= $${paramIndex}`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    let orderBy;
    switch (sort) {
      case 'price_asc':  orderBy = 'p.price ASC';         break;
      case 'price_desc': orderBy = 'p.price DESC';        break;
      case 'name_asc':   orderBy = 'p.product_name ASC';  break;
      case 'name_desc':  orderBy = 'p.product_name DESC'; break;
      default:
        orderBy = hasCreatedAt ? 'p.created_at DESC' : 'p.product_id DESC';
    }

    const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const selectCols = [
      'p.product_id',
      'p.store_id',
      'p.product_name',
      'p.title',
      'p.price',
      'p.status',
      hasCategory    ? 'p.category'            : 'NULL AS category',
      hasDescription ? 'p.description'         : 'NULL AS description',
      hasImages      ? 'p.images'              : 'NULL AS images',
      hasImage       ? 'p.image'               : 'NULL AS image_legacy',
      's.name AS store_name',
      'COALESCE(rev.total_reviews, 0)::INTEGER AS total_reviews',
      'COALESCE(rev.average_rating, 0)::NUMERIC AS average_rating',
      '(SELECT COALESCE(SUM(po.stock_qty), 0)::INTEGER FROM product_options po WHERE po.product_id = p.product_id) AS total_stock'
    ].join(', ');

    const productsQuery = `
      SELECT ${selectCols}
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::INTEGER AS total_reviews,
          COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) AS average_rating
        FROM reviews r
        WHERE r.product_id = p.product_id
      ) rev ON true
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limitNum, offset);

    const productsResult = await pool.query(productsQuery, queryParams);
    const products = productsResult.rows.map((row) => {
      const images = Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? (() => { try { return JSON.parse(row.images); } catch (_) { return []; } })() : []);
      const imageUrl = (images && images[0]) || row.image_legacy || null;
      const { image_legacy, ...rest } = row;
      return {
        ...rest,
        image_url: imageUrl,
        images: Array.isArray(images) ? images : (imageUrl ? [imageUrl] : []),
        rating_summary: {
          average_rating: Number(rest.average_rating || 0),
          total_reviews: Number(rest.total_reviews || 0),
        },
      };
    });

    res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=60');
    return res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: (pageNum * limitNum) < total
      },
      filters: { search, category, minPrice, maxPrice, sort, store_id }
    });
  } catch (err) {
    console.error('Browse products error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});




router.get('/categories/list', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { store_id = '' } = req.query;

  try {
    const storeStateResult = await pool.query(
      `SELECT s.status
       FROM products p
       JOIN stores s ON s.store_id = p.store_id
       WHERE p.product_id = $1
       LIMIT 1`,
      [parseInt(id, 10)]
    );
    if (storeStateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const storeStatus = String(storeStateResult.rows[0].status || '');
    if (storeStatus === 'Suspended') {
      return res.status(403).json({ error: 'Store unavailable', reason: 'SUSPENDED' });
    }

    const cols = await getProductColumns(pool);
    if (!cols.has('category')) {
      return res.json({ categories: [] });
    }

    let query;
    let params = [];
    if (store_id && !isNaN(parseInt(store_id, 10))) {
      const requestedStoreId = parseInt(store_id, 10);
      const storeStatusResult = await pool.query(
        'SELECT status FROM stores WHERE store_id = $1 LIMIT 1',
        [requestedStoreId]
      );
      if (storeStatusResult.rows.length === 0) {
        return res.status(404).json({ error: 'Store not found' });
      }
      const requestedStoreStatus = String(storeStatusResult.rows[0].status || '');
      if (requestedStoreStatus === 'Suspended') {
        return res.status(403).json({ error: 'Store unavailable', reason: 'SUSPENDED' });
      }
      query = `SELECT DISTINCT p.category FROM products p
               WHERE p.status = 'Active'
               AND p.store_id = $1
               AND ${ACTIVE_STORE_EXISTS_SQL}
               AND p.category IS NOT NULL AND p.category != ''
               ORDER BY p.category ASC`;
      params = [requestedStoreId];
    } else {
      query = `SELECT DISTINCT p.category FROM products p
               WHERE p.status = 'Active'
               AND ${ACTIVE_STORE_EXISTS_SQL}
               AND p.category IS NOT NULL AND p.category != ''
               ORDER BY p.category ASC`;
    }
    const result = await pool.query(query, params);
    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
    return res.json({ categories: result.rows.map(row => row.category) });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/:id/reviews', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const productId = Number.parseInt(req.params.id, 10);
  if (Number.isNaN(productId)) return res.status(400).json({ error: 'Invalid product ID' });

  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  try {
    const summary = await getProductReviewSummary(pool, productId);
    const reviewsResult = await pool.query(
      `SELECT
        r.review_id,
        r.product_id,
        r.rating,
        r.comment,
        r.review_date,
        p.product_name,
        c.first_name,
        c.last_name
       FROM reviews r
       LEFT JOIN products p ON p.product_id = r.product_id
       LEFT JOIN customers c ON c.customer_id = r.customer_id
       WHERE r.product_id = $1
       ORDER BY r.review_date DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM reviews r
       WHERE r.product_id = $1`,
      [productId]
    );
    const total = Number(totalResult.rows[0]?.total || 0);

    return res.json({
      product_id: productId,
      summary,
      reviews: reviewsResult.rows.map((row) => ({
        review_id: row.review_id,
        product_id: row.product_id,
        product_name: row.product_name || null,
        rating: Number(row.rating || 0),
        comment: row.comment || '',
        review_date: row.review_date,
        reviewer_name: buildReviewerDisplayName(row.first_name, row.last_name),
      })),
      page,
      limit,
      total,
      has_more: offset + reviewsResult.rows.length < total,
    });
  } catch (err) {
    console.error('Get product reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch product reviews' });
  }
});

router.get('/reviews/store', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });
  const storeId = Number.parseInt(req.query.store_id, 10);
  if (Number.isNaN(storeId)) return res.status(400).json({ error: 'store_id is required' });

  const limit = Math.min(20, Math.max(1, Number.parseInt(req.query.limit, 10) || 6));
  try {
    const rows = await pool.query(
      `SELECT
        r.review_id,
        r.product_id,
        r.rating,
        r.comment,
        r.review_date,
        p.product_name,
        c.first_name,
        c.last_name
      FROM reviews r
      LEFT JOIN products p ON p.product_id = r.product_id
      LEFT JOIN customers c ON c.customer_id = r.customer_id
      WHERE r.store_id = $1
      ORDER BY r.review_date DESC
      LIMIT $2`,
      [storeId, limit]
    );

    return res.json({
      store_id: storeId,
      reviews: rows.rows.map((row) => ({
        review_id: row.review_id,
        product_id: row.product_id,
        product_name: row.product_name || null,
        rating: Number(row.rating || 0),
        comment: row.comment || '',
        review_date: row.review_date,
        reviewer_name: buildReviewerDisplayName(row.first_name, row.last_name),
      })),
    });
  } catch (err) {
    console.error('Get store reviews error:', err);
    return res.status(500).json({ error: 'Failed to fetch store reviews' });
  }
});




router.get('/:id', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  const { id } = req.params;
  if (!id || isNaN(parseInt(id, 10))) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    const cols = await getProductColumns(pool);
    const hasCategory    = cols.has('category');
    const hasDescription = cols.has('description');
    const hasImages     = cols.has('images');
    const hasImage       = cols.has('image');
    const optsHaveImages = await (async () => {
      const c = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'product_options' AND column_name IN ('image', 'images')`
      );
      return { images: c.rows.some(r => r.column_name === 'images'), image: c.rows.some(r => r.column_name === 'image') };
    })();

    const selectCols = [
      'p.product_id', 'p.store_id', 'p.product_name', 'p.title', 'p.price', 'p.status',
      hasCategory    ? 'p.category'           : 'NULL AS category',
      hasDescription ? 'p.description'        : 'NULL AS description',
      hasImages      ? 'p.images'             : 'NULL AS images',
      hasImage       ? 'p.image'              : 'NULL AS image_legacy',
      's.name AS store_name',
      's.domain_name AS store_domain',
      '(SELECT COALESCE(SUM(po.stock_qty), 0)::INTEGER FROM product_options po WHERE po.product_id = p.product_id) AS total_stock'
    ].join(', ');

    const productQuery = `
      SELECT ${selectCols}
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
      WHERE p.product_id = $1
      AND ${ACTIVE_STORE_EXISTS_SQL}
    `;
    const productResult = await pool.query(productQuery, [parseInt(id, 10)]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const row = productResult.rows[0];
    const productImages = Array.isArray(row.images) ? row.images : (typeof row.images === 'string' ? (() => { try { return JSON.parse(row.images); } catch (_) { return []; } })() : []);
    const productImageUrl = (productImages && productImages[0]) || row.image_legacy || null;
    const { image_legacy, images: _im, ...product } = row;
    const productData = { ...product, image_url: productImageUrl, images: Array.isArray(productImages) ? productImages : (productImageUrl ? [productImageUrl] : []) };

    if (productData.status !== 'Active') {
      return res.status(404).json({ error: 'Product not available' });
    }

    const optionsCols = optsHaveImages.images
      ? 'option_id, option_name, option_value, stock_qty, additional_price, images'
      : (optsHaveImages.image ? 'option_id, option_name, option_value, stock_qty, additional_price, image AS images' : 'option_id, option_name, option_value, stock_qty, additional_price');
    const optionsResult = await pool.query(
      `SELECT ${optionsCols} FROM product_options WHERE product_id = $1 ORDER BY option_name, option_value`,
      [parseInt(id, 10)]
    );
    const options = optionsResult.rows.map((o) => {
      const imgs = Array.isArray(o.images) ? o.images : (typeof o.images === 'string' ? (() => { try { return JSON.parse(o.images); } catch (_) { return o.images ? [o.images] : []; } })() : []);
      return { ...o, images: imgs };
    });

    const ratingSummary = await getProductReviewSummary(pool, parseInt(id, 10));
    const recentReviewsResult = await pool.query(
      `SELECT
        r.review_id,
        r.rating,
        r.comment,
        r.review_date,
        c.first_name,
        c.last_name
       FROM reviews r
       LEFT JOIN customers c ON c.customer_id = r.customer_id
       WHERE r.product_id = $1
       ORDER BY r.review_date DESC
       LIMIT 5`,
      [parseInt(id, 10)]
    );

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    return res.json({
      product: {
        ...productData,
        options,
        rating_summary: ratingSummary,
        recent_reviews: recentReviewsResult.rows.map((row) => ({
          review_id: row.review_id,
          rating: Number(row.rating || 0),
          comment: row.comment || '',
          review_date: row.review_date,
          reviewer_name: buildReviewerDisplayName(row.first_name, row.last_name),
        })),
      },
    });
  } catch (err) {
    console.error('Get product details error:', err);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

module.exports = router;
module.exports.__testables = {
  getProductReviewSummary,
};
