'use strict';

import express from 'express';
import path from 'path';
import '@dotenvx/dotenvx/config';

const app = express();
const root = path.resolve('dist/sop/browser');
app.use(express.static(root));
app.use((_, res) => res.sendFile(`${root}/index.html`));
app.listen(process.env.APP_PORT || 8080);
