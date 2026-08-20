# Nava Transportes - Backend

## Configuração

1. Copie `.env.example` para `.env`.
2. Preencha as credenciais apenas no ambiente local ou nas variáveis da hospedagem.
3. Use valores diferentes, aleatórios e com pelo menos 32 caracteres em `JWT_SECRET` e `JWT_REFRESH_SECRET`.
4. Execute `npm install` e `npm start`.

O arquivo `.env` não deve ser versionado nem enviado junto com o projeto.

## Proteções aplicadas

- limite geral por IP e limites específicos para login e renovação de token;
- limite de tamanho do corpo JSON;
- CORS restrito às origens configuradas;
- cabeçalhos HTTP de segurança e remoção do `X-Powered-By`;
- rejeição de operadores suspeitos para reduzir tentativas de NoSQL injection e prototype pollution;
- JWT de acesso com validade de 15 minutos, algoritmo, emissor e público validados;
- remoção do acesso administrativo fixo e migração automática de senhas antigas em texto puro;
- documentação Swagger desativada em produção, salvo quando `ENABLE_API_DOCS=true`;
- respostas 404 e 500 sem detalhes internos.

Os limites podem ser ajustados pelas variáveis descritas em `.env.example`. O controle atual é mantido na memória do processo, adequado para uma única instância. Ao escalar para várias instâncias, use um armazenamento compartilhado, como Redis.

## Continuidade da quilometragem

`GET /nava/driver/trips/last-km` retorna a KM final da última viagem enviada pelo motorista autenticado. Rascunhos não são considerados.

## Verificações

```bash
npm test
npm run security:audit
```
