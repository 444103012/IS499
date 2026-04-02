const express = require('express');
const router = express.Router();

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
      limit = '12'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereConditions = ["p.status = 'Active'"];
    let queryParams = [];
    let paramIndex = 1;

    if (search.trim()) {
      queryParams.push(`%${search.trim()}%`);
      whereConditions.push(`(p.product_name ILIKE $${paramIndex} OR p.title ILIKE $${paramIndex})`);
      paramIndex++;
    }

    if (category.trim()) {
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

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    let orderBy = 'p.product_id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'p.price ASC';
        break;
      case 'price_desc':
        orderBy = 'p.price DESC';
        break;
      case 'name_asc':
        orderBy = 'p.product_name ASC';
        break;
      case 'name_desc':
        orderBy = 'p.product_name DESC';
        break;
      case 'newest':
      default:
        orderBy = 'p.product_id DESC';
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM products p
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    const productsQuery = `
      SELECT 
        p.product_id,
        p.store_id,
        p.product_name,
        p.title,
        p.price,
        p.status,
        p.category,
        p.description,
        p.image_url,
        s.name as store_name
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limitNum, offset);

    const productsResult = await pool.query(productsQuery, queryParams);

    return res.json({
      products: productsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: (pageNum * limitNum) < total
      },
      filters: {
        search,
        category,
        minPrice,
        maxPrice,
        sort
      }
    });
  } catch (err) {
    console.error('Browse products error:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
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
    const productQuery = `
      SELECT 
        p.product_id,
        p.store_id,
        p.product_name,
        p.title,
        p.price,
        p.status,
        p.category,
        p.description,
        p.image_url,
        s.name as store_name,
        s.domain_name as store_domain
      FROM products p
      LEFT JOIN stores s ON p.store_id = s.store_id
      WHERE p.product_id = $1
    `;
    const productResult = await pool.query(productQuery, [id]);

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.status !== 'Active') {
      return res.status(404).json({ error: 'Product not available' });
    }

    const optionsQuery = `
      SELECT 
        option_id,
        option_name,
        option_value,
        stock_qty,
        additional_price
      FROM product_options
      WHERE product_id = $1
      ORDER BY option_name, option_value
    `;
    const optionsResult = await pool.query(optionsQuery, [id]);

    return res.json({
      product: {
        ...product,
        options: optionsResult.rows
      }
    });
  } catch (err) {
    console.error('Get product details error:', err);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

router.get('/categories/list', async (req, res) => {
  const pool = req.app.locals.pool;
  if (!pool) return res.status(500).json({ error: 'Database not configured' });

  try {
    const query = `
      SELECT DISTINCT category
      FROM products
      WHERE status = 'Active' AND category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `;
    const result = await pool.query(query);

    return res.json({
      categories: result.rows.map(row => row.category)
    });
  } catch (err) {
    console.error('Get categories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;