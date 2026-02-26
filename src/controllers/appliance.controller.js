const Appliance = require('../models/Appliance');
const Category = require('../models/Category');
const Brand = require('../models/Brand');
const Model = require('../models/Model');
const mongoose = require('mongoose');

/**
 * Helper to resolve ID or Name
 */
const resolveEntity = async (Model, idOrName, query = {}, createData = {}) => {
  if (mongoose.Types.ObjectId.isValid(idOrName) && (new mongoose.Types.ObjectId(idOrName).toString() === idOrName)) {
    const doc = await Model.findById(idOrName);
    if (doc) return doc;
  }

  // Try to find by name (Case Insensitive)
  const escapedName = idOrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let doc = await Model.findOne({ name: { $regex: `^${escapedName}$`, $options: 'i' }, ...query });
  if (doc) return doc;

  // If not found, create new
  try {
    doc = await Model.create({ name: idOrName, ...query, ...createData });
    return doc;
  } catch (error) {
    if (error.code === 11000) {
      // If duplicate key error, it means it exists globally (like Brand name unique)
      // So we try to find it globally by name
      doc = await Model.findOne({ name: idOrName });
      if (doc) return doc;
    }
    throw error;
  }
};


/**
 * Register Appliance ~ Aaama appliances schema chhe Product naiii......
 */
exports.registerAppliance = async (req, res) => {
  try {
    const {
      category,       // category id or name
      brand,          // brand id or name
      model,          // model id or name
      purchaseDate,
      serial_number,
      invoiceNumber,
    } = req.body;

    if (!category || !brand || !model || !purchaseDate) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    /* -----------------------------
       Find or Create Category
    ----------------------------- */
    const categoryDoc = await resolveEntity(Category, category);

    /* -----------------------------
        Find or Create Brand
    ----------------------------- */
    // Note: We try to ensure it belongs to this category, but if it exists in another category,
    // resolveEntity will return that existing brand (due to unique name constraint handling).
    const brandDoc = await resolveEntity(Brand, brand, { category_id: categoryDoc._id }, { category_id: categoryDoc._id });

    /* -----------------------------
        Find or Create Model
    ----------------------------- */
    const modelDoc = await resolveEntity(Model, model, { brand_id: brandDoc._id }, { brand_id: brandDoc._id });

    /* -----------------------------
       Create Appliance (Product) 
    ----------------------------- */
    const appliance = await Appliance.create({
      user: req.user.id,
      model: modelDoc._id,
      purchase_date: purchaseDate,
      serial_number,
      invoiceNumber,
    });

    res.status(201).json({
      message: 'Appliance registered successfully',
      appliance,
    });
  } catch (err) {
    console.error("Register Appliance Error:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get Logged-in User Appliances (with populate (populate= foreign key jevo concept))
 */
exports.getMyAppliances = async (req, res) => {
  try {
    const appliances = await Appliance.find({
      user: req.user.id,
    })
      .populate({
        path: 'model',
        populate: {
          path: 'brand_id',
          populate: {
            path: 'category_id',
          },
        },
      })
      .sort({ createdAt: -1 });

    res.json(appliances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Search Categories
 */
exports.searchCategories = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q ? { name: { $regex: q, $options: 'i' } } : {};
    const categories = await Category.find(query).limit(10);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Search Brands
 */
exports.searchBrands = async (req, res) => {
  try {
    const { q, category_id } = req.query;
    const query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (category_id && mongoose.Types.ObjectId.isValid(category_id)) query.category_id = category_id;

    const brands = await Brand.find(query).limit(10);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Search Models
 */
exports.searchModels = async (req, res) => {
  try {
    const { q, brand_id } = req.query;
    const query = {};
    if (q) query.name = { $regex: q, $options: 'i' };
    if (brand_id && mongoose.Types.ObjectId.isValid(brand_id)) query.brand_id = brand_id;

    const models = await Model.find(query).limit(10);
    res.json(models);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
