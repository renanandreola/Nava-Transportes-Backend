const { Schema, model, Types } = require("mongoose");

const PaymentSchema = new Schema(
  {
    driverId: { type: Types.ObjectId, ref: "User", required: true },
    driverName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    proofSent: { type: Boolean, default: false },
    note: { type: String, trim: true },
    paidAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model("Payment", PaymentSchema);
