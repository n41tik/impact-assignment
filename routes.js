const studentController = require('./studentController')

const routes = (mods) => {
    const app = mods.app;

    app.get('/', (request, response) => {
        response.json({ info: 'Impact Assignment' })
    });

    app.post('/upload', mods.multer().single('student-records'), studentController.uploadRecords);

    app.get('/students', studentController.getStudentRecords);

    app.get('/students/:id/result', studentController.getStudentRecord);
}

module.exports = routes;