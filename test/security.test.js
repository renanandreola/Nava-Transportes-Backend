const assert = require("node:assert");
const test = require("node:test");

process.env.API_RATE_LIMIT = "2";

const {
  apiRateLimiter,
  rejectSuspiciousInput,
  securityHeaders,
} = require("../src/middlewares/security");

const createResponse = () => ({
  headers: {},
  statusCode: 200,
  setHeader(name, value) {
    this.headers[name] = value;
  },
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

test("bloqueia o IP que ultrapassa o limite", () => {
  const request = {
    method: "GET",
    ip: "127.0.0.10",
    socket: {},
    path: "/nava/test",
  };

  for (let index = 0; index < 2; index += 1) {
    const response = createResponse();
    let called = false;

    apiRateLimiter(request, response, () => {
      called = true;
    });

    assert.equal(called, true);
  }

  const response = createResponse();
  apiRateLimiter(request, response, () => {});

  assert.equal(response.statusCode, 429);
  assert.equal(response.headers["Retry-After"] !== undefined, true);
});

test("rejeita operadores suspeitos recebidos no corpo", () => {
  const response = createResponse();

  rejectSuspiciousInput(
    { query: {}, body: { filter: { $ne: null } } },
    response,
    () => assert.fail("a requisição não deveria avançar")
  );

  assert.equal(response.statusCode, 400);
});

test("aceita a estrutura normal de uma viagem", () => {
  const response = createResponse();
  let called = false;

  rejectSuspiciousInput(
    {
      query: { page: "1" },
      body: { trechos: [{ origem: "Erechim", destino: "Passo Fundo" }] },
    },
    response,
    () => {
      called = true;
    }
  );

  assert.equal(called, true);
});

test("adiciona cabeçalhos de segurança", () => {
  const response = createResponse();
  let called = false;

  securityHeaders(
    { path: "/nava/health" },
    response,
    () => {
      called = true;
    }
  );

  assert.equal(called, true);
  assert.equal(response.headers["X-Content-Type-Options"], "nosniff");
  assert.equal(response.headers["X-Frame-Options"], "DENY");
});
