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
  litrosArla: { type: Number, default: 0 },
  mediaTrecho: { type: Number, default: 0 },  // km/l
  // assinador: String,
  pago: { type: Boolean, default: false },
}, { _id: false });

const TripSchema = new Schema({
  driverId: { type: Types.ObjectId, ref: "User", required: true },
  driverName: String,
  plate: String,
  companyName: String,
  kmInicial: { type: Number, default: 0 },
  kmFinal: { type: Number, default: 0 },
  litrosTotal: { type: Number, default: 0 },
  litrosArlaTotal: { type: Number, default: 0 },
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

  observations: { type: String, default: "" },

  checklist: {
    documents: { type: Boolean, default: false },
    conditions: { type: Boolean, default: false },
  },
  checklistSalvo: { type: Boolean, default: false },

  isDraft: { type: Boolean, default: false, index: true },
  submittedAt: { type: Date, default: null },

  finalizado: { type: Boolean, default: false },
  finished: { type: Boolean, default: false },
  status: { type: String, default: "aberto" },
  finishedAt: { type: Date, default: null },
  
  latitude: { type: Number },
  longitude: { type: Number },
  locationAccuracy: { type: Number },
}, { timestamps: true });

TripSchema.index(
  { driverId: 1 },
  { unique: true, partialFilterExpression: { isDraft: true } }
);

TripSchema.index({ driverId: 1, isDraft: 1, submittedAt: -1 });

module.exports = model("Trip", TripSchema);
