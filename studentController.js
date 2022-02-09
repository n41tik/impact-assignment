const fs = require('fs');
const Pool = require('pg').Pool;
const csvToJson = require('convert-csv-to-json');

// minimum mark for a student to be considered passing
const minMarksToPass = 35;

// NOTE:- normally we should not commit the password to the code, but for the purpose of this assignment, we are doing so.
let databaseConfig = require('./config/database.json');

const pool = new Pool(databaseConfig)

const uploadRecords = async (request, response) => {
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

    // create the uploads or a sub directory if it does not exist
    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName);
    }

    const fileName = 'student-record-' + Date.now().toString() + '.csv';
    const filePath = dirName + fileName;

    try {
        fs.writeFileSync(filePath, file.buffer, 'utf8');
    } catch (e) {
        return response.status(400).json({
            message: 'Unable to save student records. Please try again'
        });
    }

    let records = csvToJson.fieldDelimiter(',').getJsonFromCsv(__dirname + '/' + filePath);

    if (records.length === 0) {
        return response.status(400).json({
            message: 'No records found in the file'
        });
    }

    const headers = Object.keys(records[0]);

    const requiredHeaders = ['name', 'age', 'mark1', 'mark2', 'mark3'];

    // validate the headers
    const headerCheck = requiredHeaders.every(header => headers.includes(header));

    if (!headerCheck) {
        return response.status(400).json({
            message: 'Required file headers are missing'
        });
    }

    const totalRecords = records.length;
    let failedRecords = 0;

    for (let i in records) {
        const insertQuery = 'INSERT INTO students (name, age, mark1, mark2, mark3, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)';
        const date = new Date();
        const values = [records[i].name, records[i].age, records[i].mark1, records[i].mark2, records[i].mark3, date, date];

        try {
            await pool.query(insertQuery, values);
        } catch (e) {
            failedRecords++;
        }
    }

    return response.json({
        message: 'File uploaded successfully',
        totalRecords: totalRecords,
        successRecords: totalRecords - failedRecords,
        failedRecords: failedRecords
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

        // checking if the student has passed or not
        if (student.mark1 <= minMarksToPass ||
            student.mark2 <= minMarksToPass ||
            student.mark3 <= minMarksToPass) {
            student.result = 'failed';
        } else {
            student.result = 'passed';
        }

        return response.status(200).json(student)
    });
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
        // return all the students with their result
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