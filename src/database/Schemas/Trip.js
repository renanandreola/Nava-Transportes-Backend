const { Schema, model, Types } = require("mongoose");

const TrechoSchema = new Schema({
  data: Date,
  origem: String,
  destino: String,
  frete: { type: Number, default: 0 },        // R$
  adiantamento: { type: Number, default: 0 }, // R$
  saldo: { type: Number, default: 0 },        // R$ (calc. opcional)
  kmInicial: { type: Number, default: 0 },
  kmFinal: { type: Number, default: 0 },
  posto: String,
  litros: { type: Number, default: 0 },
  mediaTrecho: { type: Number, default: 0 },  // km/l
  // assinador: String,
  pago: { type: Boolean, default: false },
}, { _id: false });

const TripSchema = new Schema({
  driverId: { type: Types.ObjectId, ref: "User", required: true },
  driverName: String,
  plate: String,

  kmInicial: { type: Number, default: 0 },
  kmFinal: { type: Number, default: 0 },
  litrosTotal: { type: Number, default: 0 },
  mediaGeral: { type: Number, default: 0 },     // km/l da viagem

  // totalAssinado: { type: Number, default: 0 },
  // totalPago: { type: Number, default: 0 },
  premiacaoPercentual: { type: Number, default: 0 },
  premiacaoValor: { type: Number, default: 0 },
  totalDoFrete: { type: Number, default: 0 },

  extras: [{
    descricao: String,
    valor: { type: Number, default: 0 },
  }],

  trechos: [TrechoSchema],
  
  latitude: { type: Number },
  longitude: { type: Number },
  locationAccuracy: { type: Number },
}, { timestamps: true });

module.exports = model("Trip", TripSchema);
