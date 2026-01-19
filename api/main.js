'use strict';

import express from 'express';
import { Pool } from 'pg';
import '@dotenvx/dotenvx/config';
import bcrypt from 'bcrypt';
import path from 'path';

const app = express();
app.use(express.json());
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.post('/api/register', async (req, res) => {
  if (!req.body.username) {
    return res.status(422).json({ message: 'Username required!' });
  }

  if ((await pool.query(
    `SELECT *
     FROM "users"
     WHERE "username" = $1
     LIMIT 1`,
    [req.body.username]
  )).rowCount) {
    return res.status(422).json({ message: 'Username already in use!' });
  }

  if (!req.body.password) {
    return res.status(422).json({ message: 'Password required!' });
  }

  if (req.body.password.length < 8) {
    return res.status(422).json({ message: 'Password too short!' });
  }

  res.status(201).json((await pool.query(
    `INSERT INTO "users"
     VALUES ($1, $2)
     RETURNING "username"`,
    [req.body.username, await bcrypt.hash(req.body.password, 10)]
  )).rows);
});

const root = path.resolve('dist/sop/browser');
app.use(express.static(root));
app.use((_, res) => res.sendFile(`${root}/index.html`));
app.listen(process.env.APP_PORT || 8080);
