const Trip = require("../database/Schemas/Trip");

async function getTripsBetween(start, end) {
  return Trip.find({
    createdAt: {
      $gte: start,
      $lte: end,
    },
  }).lean();
}

module.exports = {
  getTripsBetween,
};
