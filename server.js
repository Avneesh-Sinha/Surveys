const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL module

const app = express();
const port = 3000;

// PostgreSQL connection pool
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'surveys',
    password: '12345',
    port: 5432,
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/create-survey', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-survey.html'));
});

app.get('/fill-survey', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'fill-survey.html'));
});

app.get('/surveys', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                surveys.survey_id AS survey_id,
                surveys.title AS title
            FROM surveys
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching surveys:', error);
        res.status(500).send('Error fetching surveys');
    }
});

app.get('/survey/:id', async (req, res) => {
    const surveyId = parseInt(req.params.id, 10);

    if (isNaN(surveyId)) {
        return res.status(400).send('Invalid survey ID');
    }

    try {
        const result = await pool.query(`
            SELECT 
                surveys.title AS title,
                sections.section_id AS section_id,
                sections.section AS section,
                questions.question_id AS question_id,
                questions.question AS question,
                questions.question_type AS question_type,
                options.option AS option
            FROM surveys
            JOIN sections ON surveys.survey_id = sections.survey_id
            JOIN questions ON sections.section_id = questions.section_id
            LEFT JOIN options ON questions.question_id = options.question_id
            WHERE surveys.survey_id = $1
        `, [surveyId]);

        if (result.rows.length === 0) {
            return res.status(404).send('Survey not found');
        }

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching survey data:', error);
        res.status(500).send('Error fetching survey data');
    }
});


app.post('/create-survey', async (req, res) => {
    const surveyData = req.body;
    console.log('Received survey data:', surveyData);
    const { title, created_by_user_id, sections } = surveyData;

    if (!title || !created_by_user_id) {
        return res.status(400).json({ error: 'Survey title and User ID are required' });
    }

    try {
        await pool.query('BEGIN');

        // 1. Insert into the 'surveys' table
        const surveyResult = await pool.query(
            'INSERT INTO surveys (title, createdbyuserid) VALUES ($1, $2) RETURNING survey_id',
            [title, created_by_user_id]
        );
        const surveyId = surveyResult.rows[0].survey_id;

        // 2. Loop through sections and insert into the 'sections' table
        if (sections && sections.length > 0) {
            for (const section of sections) {
                const sectionResult = await pool.query(
                    'INSERT INTO sections (survey_id, section) VALUES ($1, $2) RETURNING section_id',
                    [surveyId, section.name]
                );
                const sectionId = sectionResult.rows[0].section_id;

                // 3. Loop through questions within each section and insert into the 'questions' table
                if (section.questions && section.questions.length > 0) {
                    for (const question of section.questions) {
                        const questionResult = await pool.query(
                            'INSERT INTO questions (section_id, question, question_type) VALUES ($1, $2, $3) RETURNING question_id',
                            [sectionId, question.text, question.type] // Insert question_type
                        );
                        const questionId = questionResult.rows[0].question_id;

                        // 4. Loop through options within each question and insert into the 'options' table
                        if (question.options && question.options.length > 0) {
                            for (const option of question.options) {
                                await pool.query(
                                    'INSERT INTO options (question_id, option) VALUES ($1, $2)',
                                    [questionId, option.text]
                                );
                            }
                        }
                    }
                }
            }
        }

        await pool.query('COMMIT');

        res.status(200).json({ message: 'Survey saved successfully', surveyId });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Error saving survey data:', error);
        res.status(500).send('Error saving survey data');
    }
});

app.post('/create-user', async (req, res) => {
    const { name, company } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO users (name, company) VALUES ($1, $2) RETURNING user_id',
            [name, company]
        );
        const userId = result.rows[0].user_id;

        res.status(200).json({ user_id: userId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Error creating user' });
    }
});

app.post('/submit-survey', async (req, res) => {
    const { survey_id, user_id, ...answers } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Insert into `answers` table (no score for now, we'll update it later)
        const insertAnswerResult = await client.query(
            'INSERT INTO answers (survey_id, user_id) VALUES ($1, $2) RETURNING answer_id',
            [survey_id, user_id]
        );
        const answerId = insertAnswerResult.rows[0].answer_id;

        const answerDetailsValues = [];
        let totalScore = 0;

        // Insert into `answer_details` table
        for (const [questionId, response] of Object.entries(answers)) {
            const qId = parseInt(questionId, 10);
            if (!isNaN(qId)) { // Ensure questionId is a number
                if (!isNaN(response)) { // Ensure response is a number
                    // Multiple choice question: retrieve option_id and compute score
                    const optionIdResult = await client.query(
                        'SELECT option_id FROM options WHERE question_id = $1 ORDER BY option_id OFFSET $2 LIMIT 1',
                        [qId, response - 1]
                    );

                    if (optionIdResult.rows.length > 0) {
                        const optionId = optionIdResult.rows[0].option_id;
                        const score = response * 5; // Calculate score as response * 5

                        // Push values to array
                        answerDetailsValues.push(`(${answerId}, ${qId}, ${optionId}, ${score})`);
                        totalScore += score; // Add to total score
                    }
                } else {
                    // Text or numeric question
                    await client.query(
                        'INSERT INTO answer_details (answer_id, question_id, answer_text) VALUES ($1, $2, $3)',
                        [answerId, qId, response]
                    );
                }
            }
        }

        if (answerDetailsValues.length > 0) {
            // Insert into `answer_details` table
            const query = `
                INSERT INTO answer_details (answer_id, question_id, option_id, answer_score)
                VALUES ${answerDetailsValues.join(', ')}
            `;
            await client.query(query);
        }

        // Update the total score in the `answers` table
        await client.query(
            'UPDATE answers SET score = $1 WHERE answer_id = $2',
            [totalScore, answerId]
        );

        // Update survey_stats table
        const updateStatsQuery = `
            WITH score_data AS (
                SELECT
                    a.survey_id,
                    ad.question_id,
                    array_agg(ad.answer_score ORDER BY ad.answer_score) AS score_array,
                    AVG(ad.answer_score) AS avg_score,
                    MAX(ad.answer_score) AS highest_score,
                    MIN(ad.answer_score) AS lowest_score
                FROM
                    answer_details ad
                JOIN
                    answers a ON ad.answer_id = a.answer_id
                WHERE
                    a.survey_id = $1
                GROUP BY
                    a.survey_id, ad.question_id
            )
            INSERT INTO survey_stats (survey_id, question_id, avg_score, median_score, highest_score, lowest_score)
            SELECT
                sd.survey_id,
                sd.question_id,
                sd.avg_score,
                calculate_median(sd.score_array) AS median_score,
                sd.highest_score,
                sd.lowest_score
            FROM
                score_data sd
            ON CONFLICT (survey_id, question_id) DO UPDATE
            SET
                avg_score = EXCLUDED.avg_score,
                median_score = EXCLUDED.median_score,
                highest_score = EXCLUDED.highest_score,
                lowest_score = EXCLUDED.lowest_score;
        `;

        await client.query(updateStatsQuery, [survey_id]);

        await client.query('COMMIT');
        res.status(200).json({  answer_id: answerId, total_score: totalScore });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving survey answers:', error.message);
        res.status(500).json({ error: 'Error saving survey answers' });
    } finally {
        client.release();
    }
});

app.get('/survey-data/:surveyId/:answerId', async (req, res) => {
    const {surveyId, answerId} = req.params;
    
    const client = await pool.connect();
    try {
        const surveyStatsResult = await client.query(
            'SELECT question_id, avg_score, median_score, highest_score, lowest_score FROM survey_stats WHERE survey_id = $1',
            [surveyId]
        );
        
        const userAnswersResult = await client.query(
            'SELECT question_id, answer_score FROM answer_details WHERE answer_id = $1',
            [answerId]
        );
        
        // Format the data for Chart.js
        const surveyStats = surveyStatsResult.rows.reduce((acc, stat) => {
            acc[stat.question_id] = {
                avg_score: stat.avg_score,
                median_score: stat.median_score,
                highest_score: stat.highest_score,
                lowest_score: stat.lowest_score,
            };
            return acc;
        }, {});
        
        const userAnswers = userAnswersResult.rows.reduce((acc, answer) => {
            if (!acc[answer.question_id]) {
                acc[answer.question_id] = [];
            }
            acc[answer.question_id].push(answer.answer_score);
            return acc;
        }, {});
        
        // console.log(surveyStats, userAnswers);

        res.json({ surveyStats, userAnswers });
    } catch (error) {
        console.error('Error retrieving survey data:', error.message);
        res.status(500).json({ error: 'Error retrieving survey data' });
    } finally {
        client.release();
    }
});




app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

