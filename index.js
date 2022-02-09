const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer')
const routes = require('./routes');

const app = express();
const port = process.argv[2] || 3000;

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

const mods = {
    app: app,
    multer: multer
}

routes(mods);

app.listen(port, () => {
    console.log(`App running on port ${port}.`)
});