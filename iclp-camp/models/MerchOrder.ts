import mongoose, { Schema, models, model } from "mongoose";

const ItemSchema = new Schema(
  {
    variantId: { type: Schema.Types.ObjectId, ref: "ProductVariant" },
    sku: String,
    name: String,
    attributes: {
      design: String,
      color: String,
      size: String
    },
    qty: Number,
    unitPrice: Number
  },
  { _id: false }
);

const MerchOrderSchema = new Schema(
  {
    buyer: {
      firstName: String,
      lastName: String,
      email: String
    },

    items: {
      type: [ItemSchema],
      default: []
    },

    totalARS: { type: Number, default: 0 },

    externalReference: { type: String, default: "" },

    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
    deliveredBy: { type: String, default: "" },

    payment: {
      status: { type: String, default: "pending" },
      preferenceId: String,
      paymentId: String,
      initPoint: String,
      lastEventAt: Date
    }
  },
  { timestamps: true }
);

export const MerchOrder = models.MerchOrder || model("MerchOrder", MerchOrderSchema);
