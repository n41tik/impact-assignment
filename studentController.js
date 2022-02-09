const fs = require('fs');
const Pool = require('pg').Pool

const minMarksToPass = 35;

let databaseConfig = require('./config/database.json');

const pool = new Pool(databaseConfig)

const uploadRecords = (request, response) => {
    const file = request.file;

    if (!file) {
        return response.status(400).json({
            message: 'No file uploaded'
        });
    }

    if (file.mimetype !== 'text/csv') {
        return response.status(400).json({
            message: 'Invalid file type'
        });
    }

    let dirName = 'uploads/';

    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
    }

    const fileName = 'student-record-' + Date.now().toString() + '.csv';
    const filePath = dirName + fileName;

    try {
        fs.writeFile(filePath, file.buffer, (err) => {
            if (err) {
                return response.status(500).json({
                    message: 'Error uploading file'
                });
            }
        });
    } catch (e) {
        return response.status(400).json({
            message: 'Unable to save student records. Please try again'
        });
    }

    return response.json({
        message: 'File uploaded successfully',
    });
};

const getStudentRecord = (request, response) => {
    const id = parseInt(request.params.id)

    pool.query('SELECT id,name,mark1,mark2,mark3 FROM students WHERE id = $1', [id], (error, results) => {
        if (error) {
            return response.status(500).json({
                message: 'Error fetching student record'
            });
        }

        if (results.rowCount === 0) {
            return response.status(404).json({
                message: 'Student record not found'
            });
        }

        const student = results.rows[0];

        if (student.mark1 <= minMarksToPass ||
            student.mark2 <= minMarksToPass ||
            student.mark3 <= minMarksToPass) {
            student.result = 'failed';
        } else {
            student.result = 'passed';
        }

        return response.status(200).json(student)
    })
};

const getStudentRecords = (request, response) => {
    const resultStatus = request.query.resultStatus;

    let resultQueryParams = [];
    let resultQuery = '';

    if (resultStatus) {
        resultQuery = 'SELECT id,name,mark1,mark2,mark3,$1::text as result FROM students';
        resultQueryParams = [resultStatus];

        if (resultStatus === 'passed') {
            resultQuery += ' WHERE (mark1 > $2 and mark2 > $3 and mark3 > $4)';
        } else if (resultStatus === 'failed') {
            resultQuery += ' WHERE (mark1 < $2 or mark2 < $3 or mark3 < $4)';
        } else {
            return response.status(400).json({
                message: 'Invalid result status'
            });
        }
    } else {
        resultQuery = `SELECT id,
                              name,
                              mark1,
                              mark2,
                              mark3,
                              CASE
                                  WHEN mark1 < $1 or mark2 < $2 or mark3 < $3 THEN 'failed'::text
                                  ELSE 'passed'::text
                                  END AS result
                       FROM students`;
    }

    resultQueryParams.push(...[minMarksToPass, minMarksToPass, minMarksToPass]);

    pool.query(resultQuery, resultQueryParams, (error, results) => {
        if (error) {
            return response.status(500).json({
                message: 'Error fetching student record'
            });
        }

        if (results.rowCount === 0) {
            return response.status(404).json({
                message: 'No data available'
            });
        }

        return response.status(200).json(results.rows)
    })
};

module.exports = {
    uploadRecords,
    getStudentRecord,
    getStudentRecords
};