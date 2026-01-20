'use strict';

import express from 'express';
import connectPgSimple from 'connect-pg-simple';
import expressSession from 'express-session';
import { Pool } from 'pg';
import '@dotenvx/dotenvx/config';
import swaggerUiExpress from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import bcrypt from 'bcrypt';
import path from 'path';

const app = express();
app.use(express.json());
const pgSession = connectPgSimple(expressSession);
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(expressSession({
  secret: 'secret',
  store: new pgSession({
    pool: pgPool,
    createTableIfMissing: true
  }),
  resave: false,
  saveUninitialized: false
}));
app.use('/api/docs', swaggerUiExpress.serve, swaggerUiExpress.setup(swaggerJSDoc({
  apis: ['api/**/*.js'],
  definition: {
    openapi: '3.0.0'
  }
})));

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }
  return next();
};

/**
  * @openapi
  * /api/register:
  *   post:
  *     summary: Register a user
  *     requestBody:
  *       required: true
  *       content:
  *         application/json:
  *           schema:
  *             type: object
  *             properties:
  *               username:
  *                 type: string
  *               password:
  *                 type: string
  *     responses:
  *       201:
  *         description: User registered
  *       422:
  *         description: Validation error
  */
app.post('/api/register', async (req, res) => {
  if (!req.body.username) {
    return res.status(422).json({ validation: 'username.required' });
  }

  if (typeof req.body.username !== 'string') {
    return res.status(422).json({ validation: 'username.string' });
  }

  if ((await pgPool.query(
    `SELECT *
     FROM "users"
     WHERE "username" = $1
     LIMIT 1`,
    [req.body.username]
  )).rowCount) {
    return res.status(422).json({ validation: 'username.duplicate' });
  }

  if (!req.body.password) {
    return res.status(422).json({ validation: 'password.required' });
  }

  if (typeof req.body.password !== 'string') {
    return res.status(422).json({ validation: 'password.string' });
  }

  if (req.body.password.length < 8) {
    return res.status(422).json({ validation: 'password.short' });
  }

  return res.status(201).json((await pgPool.query(
    `INSERT INTO "users" ("username", "password")
     VALUES ($1, $2)
     RETURNING "username"`,
    [req.body.username, await bcrypt.hash(req.body.password, 10)]
  )).rows[0]);
});

app.post('/api/login', async (req, res) => {
  const users = await pgPool.query(
    `SELECT *
     FROM "users"
     WHERE "username" = $1
     LIMIT 1`,
    [req.body.username]
  );

  const invalid = !users.rowCount || !await bcrypt.compare(req.body.password, users.rows[0].password);

  req.session.regenerate(err => {
    if (err) {
      console.error(err);
      return req.sendStatus(500);
    }

    if (invalid) {
      return res.sendStatus(401);
    }

    req.session.user = {
      id: users.rows[0].id,
      username: users.rows[0].username
    };
    return res.status(200).json(req.session.user);
  });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500);
    }

    return res.sendStatus(204);
  });
});

app.get('/api/elements', async (_, res) => {
  return res.status(200).json((await pgPool.query(
    `SELECT *
     FROM "elements"`
  )).rows);
});

app.post('/api/elements/', authMiddleware, async (req, res) => {
  if (!req.body.number) {
    return res.status(422).json({ validation: 'number.required' });
  }

  if (typeof req.body.number !== 'number') {
    return res.status(422).json({ validation: 'number.number' });
  }

  if (req.body.number < 1) {
    return res.status(422).json({ validation: 'number.low' });
  }

  if ((await pgPool.query(
    `SELECT *
     FROM "elements"
     WHERE "number" = $1
     LIMIT 1`,
    [req.body.number]
  )).rowCount) {
    return res.status(422).json({ validation: 'number.duplicate' });
  }

  if (!req.body.name) {
    return res.status(422).json({ validation: 'name.required' });
  }

  if (!req.body.symbol) {
    return res.status(422).json({ validation: 'symbol.required' });
  }

  if (!req.body.mass) {
    return res.status(422).json({ validation: 'mass.required' });
  }

  if (typeof req.body.mass !== 'number') {
    return res.status(422).json({ validation: 'mass.number' });
  }

  if (req.body.mass < 0) {
    return res.status(422).json({ validation: 'mass.low' });
  }

  if (!req.body.synthetic) {
    return res.status(422).json({ validation: 'synthetic.required' });
  }

  if (typeof req.body.synthetic !== 'boolean') {
    return res.status(422).json({ validation: 'synthetic.boolean' });
  }

  if (req.body.melting && typeof req.body.melting !== 'number') {
    return res.status(422).json({ validation: 'melting.number' });
  }

  if (req.body.boiling && typeof req.body.boiling !== 'number') {
    return res.status(422).json({ validation: 'boiling.number' });
  }

  return res.status(201).json((await pgPool.query(
    `INSERT INTO "users"
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      req.body.number,
      req.body.name,
      req.body.symbol,
      req.body.mass,
      req.body.synthetic,
      req.body.melting,
      req.body.boiling
    ]
  )).rows[0]);
});

app.put('/api/elements/:number', authMiddleware, async (req, res) => {
  const elements = await pgPool.query(
    `SELECT *
     FROM "elements"
     WHERE "number" = $1
     LIMIT 1`,
    [req.params.number]
  );

  if (!elements.rowCount) {
    return res.sendStatus(404);
  }

  return res.status(200).json((await pgPool.query(
    `UPDATE "users"
     SET
       "name" = $1,
       "symbol" = $2.
       "mass" = $3,
       "synthetic" = $4,
       "melting" = $5,
       "boiling" = $6
     WHERE "number" = $7
     RETURNING *`,
    [
      elements.rows[0].name,
      elements.rows[0].symbol,
      elements.rows[0].mass,
      elements.rows[0].synthetic,
      elements.rows[0].melting,
      elements.rows[0].boiling,
      elements.rows[0].number
    ]
  )).rows[0]);
});

app.delete('/api/elements/:number', authMiddleware, async (req, res) => {
  if ((await pgPool.query(
    `DELETE FROM "elements"
     WHERE "number" = $1`,
    [req.params.number]
  )).rows) {
    return res.sendStatus(204);
  }

  return res.sendStatus(404);
});

app.get('/api/queries/elements', async (_, res) => {
  return res.status(200).json((await pgPool.query(
    `SELECT "symbol", "number"
     FROM "elements"
     ORDER BY "symbol"`
  )).rows);
});

app.get('/api/queries/liquid', async (req, res) => {
  return res.status(200).json((await pgPool.query(
    `SELECT "name", "melting", "boiling"
     FROM "elements"
     WHERE "melting" <= $1 AND $1 <= "boiling"`,
    [req.query.celsius ?? 500]
  )).rows);
});

app.get('/api/queries/record', async (_, res) => {
  const records = await pgPool.query(
    `SELECT "name", "symbol"
     FROM "elements"
     WHERE "boiling" - "melting" = (
       SELECT max("boiling" - "melting")
       FROM "elements"
     )
     LIMIT 1`
  );

  if (records.rowCount) {
    return res.status(200).json(records.rows[0]);
  }

  return res.sendStatus(404);
});

const root = path.resolve('dist/sop/browser');
app.use(express.static(root));
app.use((_, res) => res.sendFile(`${root}/index.html`));
app.listen(process.env.APP_PORT ?? 8080);
