'use strict';

import express from 'express';
import { Pool } from 'pg';
import '@dotenvx/dotenvx/config';
import connectPgSimple from 'connect-pg-simple';
import expressSession from 'express-session';
import bcrypt from 'bcrypt';
import path from 'path';

const app = express();
app.use(express.json());
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

const pgSession = connectPgSimple(expressSession);
app.use(expressSession({
  secret: 'secret',
  store: new pgSession({
    pool: pgPool,
    createTableIfMissing: true
  }),
  resave: false,
  saveUninitialized: false
}));

function authMiddleware(req, res, next) {
  if (!req.session.user) {
    return res.sendStatus(401);
  }
  next();
}

app.post('/api/register', async (req, res) => {
  if (!req.body.username) {
    return res.status(422).json({ validation: 'Username required!' });
  }

  if ((await pgPool.query(
    `SELECT *
     FROM "users"
     WHERE "username" = $1
     LIMIT 1`,
    [req.body.username]
  )).rowCount) {
    return res.status(422).json({ validation: 'Username already in use!' });
  }

  if (!req.body.password) {
    return res.status(422).json({ validation: 'Password required!' });
  }

  if (req.body.password.length < 8) {
    return res.status(422).json({ validation: 'Password too short!' });
  }

  res.status(201).json((await pgPool.query(
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

  if (!users.rowCount || !await bcrypt.compare(req.body.password, users.rows[0].password)) {
    return res.sendStatus(401);
  }

  req.session.user = {
    id: users.rows[0].id,
    username: users.rows[0].username
  };
  return res.status(200).json(req.session.user);
});

app.post('/api/logout', authMiddleware, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500);
    }

    res.clearCookie();
    res.sendStatus(204);
  });
});

const root = path.resolve('dist/sop/browser');
app.use(express.static(root));
app.use((_, res) => res.sendFile(`${root}/index.html`));
app.listen(process.env.APP_PORT || 8080);
