import mongoose, { Schema, models, model } from "mongoose";

const ProductVariantSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },

    sku: { type: String, required: true, unique: true },

    attributes: {
      design: { type: String, required: true },   // "LEON", "LOGO", etc
      color: { type: String, required: true },    // "NEGRO", "BLANCO", etc
      size: { type: String, default: "" }         // solo tee: XS,S,M,L,XL
    },

    photoUrl: { type: String, default: "" },      // URL imagen (Cloudinary/S3/etc)
    stock: { type: Number, required: true, default: 0 },

    priceBundle: { type: Number, required: true },      // precio con inscripción
    priceStandalone: { type: Number, required: true },  // precio comprándolo aparte

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const ProductVariant =
  models.ProductVariant || model("ProductVariant", ProductVariantSchema);
