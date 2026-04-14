
const express = require('express');
const router = express.Router();


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

    let whereConditions = ["p.status = 'Active'"];
    let queryParams = [];
    let paramIndex = 1;

    if (store_id && !isNaN(parseInt(store_id, 10))) {
      queryParams.push(parseInt(store_id, 10));
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
      's.name AS store_name'
    ].join(', ');

    const productsQuery = `
      SELECT ${selectCols}
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
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
      return { ...rest, image_url: imageUrl, images: Array.isArray(images) ? images : (imageUrl ? [imageUrl] : []) };
    });

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
    const cols = await getProductColumns(pool);
    if (!cols.has('category')) {
      return res.json({ categories: [] });
    }

    let query;
    let params = [];
    if (store_id && !isNaN(parseInt(store_id, 10))) {
      query = `SELECT DISTINCT category FROM products
               WHERE status = 'Active' AND store_id = $1 AND category IS NOT NULL AND category != ''
               ORDER BY category ASC`;
      params = [parseInt(store_id, 10)];
    } else {
      query = `SELECT DISTINCT category FROM products
               WHERE status = 'Active' AND category IS NOT NULL AND category != ''
               ORDER BY category ASC`;
    }
    const result = await pool.query(query, params);
    return res.json({ categories: result.rows.map(row => row.category) });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
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
      's.domain_name AS store_domain'
    ].join(', ');

    const productQuery = `
      SELECT ${selectCols}
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
      WHERE p.product_id = $1
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

    return res.json({ product: { ...productData, options } });
  } catch (err) {
    console.error('Get product details error:', err);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

module.exports = router;
