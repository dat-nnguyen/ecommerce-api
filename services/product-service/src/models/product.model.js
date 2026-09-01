import mongoose from 'mongoose';

/**
 * TODO 4.2.1: Product Mongoose Schema & Compound Indexes
 *
 * Requirements:
 * 1. Define fields:
 *    - name: String (required, trimmed, max 200)
 *    - description: String (required, max 2000)
 *    - price: Number (required, min 0)
 *    - category: String (required, indexed)
 *    - stock: Number (required, integer, min 0, default 0)
 *    - sku: String (required, unique, uppercase)
 *    - images: [String] (array of image URLs)
 *    - isActive: Boolean (default true)
 *    - timestamps: true (createdAt, updatedAt)
 * 2. Define Compound & Text Indexes:
 *    - Text index on { name: 'text', description: 'text' } for full-text catalog search.
 *    - Compound index on { category: 1, price: 1 } for fast filtered queries.
 *    - Compound index on { isActive: 1, createdAt: -1 } for storefront listing.
 */

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound & Text indexes for performant queries
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ isActive: 1, createdAt: -1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;
