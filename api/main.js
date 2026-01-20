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
  definition: {}
})));

const authMiddleware = (req, res, next) => {
  if (!req.session.user) {
    return res.sendStatus(401);
  }
  return next();
};

app.post('/api/register', async (req, res) => {
  if (!req.body.username) {
    return res.status(422).json({ validation: 'username.required' });
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

  if (req.body.password.length < 8) {
    return res.status(422).json({ validation: 'password.short' });
  }

  return res.status(201).json((await pgPool.query(
    `INSERT INTO "users" ("username", "password")
     VALUES ($1, $2)
     RETURNING "username"`,
    [req.body.username, await bcrypt.hash(req.body.password, 10)]
  )).rows);
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

const root = path.resolve('dist/sop/browser');
app.use(express.static(root));
app.use((_, res) => res.sendFile(`${root}/index.html`));
app.listen(process.env.APP_PORT || 8080);
