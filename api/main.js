import '@dotenvx/dotenvx/config';
import path from 'path';
import express from 'express';

const app = express();

app.use(express.static('dist/sop/browser'));
app.use((_, res) => res.sendFile(path.resolve('dist/sop/browser/index.html')));

app.listen(process.env.APP_PORT || 8080);
