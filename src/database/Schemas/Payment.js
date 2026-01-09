const { Schema, model, Types } = require("mongoose");

const PaymentSchema = new Schema(
  {
    driverId: { type: Types.ObjectId, ref: "User", required: true },
    driverName: { type: String, required: true },

    valorPago: { type: Number, required: true },
    comprovanteEnviado: { type: Boolean, default: false },
    observacao: { type: String },

    dataPagamento: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = model("Payment", PaymentSchema);
