document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Fetch and display survey titles
        const response = await fetch('/surveys');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const surveys = await response.json();
        displaySurveyTitles(surveys);
    } catch (error) {
        console.error('Error fetching survey data:', error);
    }
});

function displaySurveyTitles(surveys) {
    const container = document.getElementById('surveyContainer');

    // Clear previous content
    container.innerHTML = '';

    // Create a dropdown (select) element for survey titles
    const dropdown = document.createElement('select');
    dropdown.id = 'surveyDropdown';
    dropdown.innerHTML = '<option value="">Select a Survey</option>'; // Default option

    // Loop through surveys and create options
    surveys.forEach(survey => {
        const option = document.createElement('option');
        option.value = survey.survey_id;
        option.textContent = survey.title;
        dropdown.appendChild(option);
    });

    // Add event listener to handle dropdown change
    dropdown.addEventListener('change', (event) => {
        const selectedSurveyId = event.target.value;
        if (selectedSurveyId) {
            displaySurveyDetails(selectedSurveyId);
        }
    });

    // Append the dropdown to the container
    container.appendChild(dropdown);
}


async function displaySurveyDetails(surveyId) {
    try {
        // Fetch survey details based on surveyId
        const response = await fetch(`/survey/${surveyId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const surveyDetails = await response.json();
        renderSurveyDetails(surveyDetails, surveyId);
    } catch (error) {
        console.error('Error fetching survey details:', error);
    }
}

function renderSurveyDetails(surveyDetails, surveyId) {
    const surveysContainer = document.getElementById('surveyContainer');
    const surveyHead = document.getElementById('surveytitleplaceholder');
    
    // Clear previous content
    surveysContainer.innerHTML = '';
    document.getElementById('toclear').textContent = '';
    
    // Set the survey title
    surveyHead.textContent = surveyDetails[0]?.title || 'Survey Title';

    // Create a form element
    const form = document.createElement('form');
    form.id = 'surveyForm';

    // Create a hidden input for survey ID
    const surveyIdInput = document.createElement('input');
    surveyIdInput.type = 'hidden';
    surveyIdInput.name = 'survey_id';
    surveyIdInput.value = surveyId;
    form.appendChild(surveyIdInput);

    // Create inputs for user ID, name, and company
    const userIdInput = document.createElement('input');
    userIdInput.type = 'hidden';
    userIdInput.name = 'user_id';
    userIdInput.value = 'user_' + Math.floor(Math.random() * 1000); 
    form.appendChild(userIdInput);

    const sectionsMap = {};

    surveyDetails.forEach(item => {
        if (!sectionsMap[item.section_id]) {
            sectionsMap[item.section_id] = {
                section: item.section,
                questions: {}
            };
        }

        if (!sectionsMap[item.section_id].questions[item.question_id]) {
            sectionsMap[item.section_id].questions[item.question_id] = {
                question: item.question,
                question_id: item.question_id,
                question_type: item.question_type,
                options: []
            };
        }

        if (item.option) {
            sectionsMap[item.section_id].questions[item.question_id].options.push(item.option);
        }
    });

    Object.values(sectionsMap).forEach(sectionData => {
        const sectionElement = document.createElement('div');
        sectionElement.className = 'section';
        sectionElement.innerHTML = `
            <h2>${sectionData.section}</h2>
            <hr class="section-emphasis">
        `;
        form.appendChild(sectionElement);

        Object.values(sectionData.questions).forEach(questionData => {
            const questionElement = document.createElement('div');
            questionElement.innerHTML = `
                <h3>${questionData.question}</h3>
            `;
            if (questionData.question_type === 'multiple_choice') {
                const selectElement = document.createElement('select');
                selectElement.name = `${questionData.question_id}`;
                selectElement.id = `${questionData.question_id}`;
            
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Select an option';
                selectElement.appendChild(defaultOption);
            
                questionData.options.forEach((option, index) => {
                    const optionElement = document.createElement('option');
                    optionElement.value = index+1;
                    optionElement.textContent = option;
                    selectElement.appendChild(optionElement);
                });
            
                questionElement.appendChild(selectElement);
            } else if (questionData.question_type === 'text') {
                const textBoxElement = document.createElement('input');
                textBoxElement.type = 'text';
                textBoxElement.name = `${questionData.question_id}`;
                textBoxElement.placeholder = 'Your answer here';
                textBoxElement.id = `${questionData.question_id}`;
                questionElement.appendChild(textBoxElement);
            }

            sectionElement.appendChild(questionElement);
        });
    });

    const userInfoContainer = document.createElement('div');
    userInfoContainer.className = 'user-info-container';

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Your Name';
    nameLabel.style = 'padding-bottom: 15px';
    userInfoContainer.appendChild(nameLabel);

    const nameInput = document.createElement('input');
    nameInput.id = 'surveyTextbox';
    nameInput.type = 'text';
    nameInput.name = 'user_name';
    nameInput.placeholder = 'Your Name';
    nameInput.required = true;
    userInfoContainer.appendChild(nameInput);

    const companyLabel = document.createElement('label');
    companyLabel.textContent = 'Your Company';
    companyLabel.style = 'padding-bottom: 15px';
    userInfoContainer.appendChild(companyLabel);

    const companyInput = document.createElement('input');
    companyInput.id = 'surveyTextbox';
    companyInput.type = 'text';
    companyInput.name = 'user_company';
    companyInput.placeholder = 'Your Company';
    companyInput.required = true;
    userInfoContainer.appendChild(companyInput);

    form.appendChild(userInfoContainer);

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit Survey';
    submitButton.id = 'submitButton';

    form.appendChild(submitButton);

    surveysContainer.appendChild(form);

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const userName = form.querySelector('input[name="user_name"]').value;
        const userCompany = form.querySelector('input[name="user_company"]').value;

        const formData = new FormData(form);

        const answers = {};
        formData.forEach((value, key) => {
            if (!answers[key]) {
                answers[key] = value;
            } else {
                if (!Array.isArray(answers[key])) {
                    answers[key] = [answers[key]];
                }
                answers[key].push(value);
            }
        });

        try {
            const userResponse = await fetch('/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: userName,
                    company: userCompany
                })
            });

            if (!userResponse.ok) {
                throw new Error('Error creating user');
            }

            const userData = await userResponse.json();
            const userId = userData.user_id;
            
            answers.user_id = userId;

            const surveyResponse = await fetch('/submit-survey', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(answers)
            });

            if (surveyResponse.ok) {
                const responseData = await surveyResponse.json();
                const answerId = responseData.answer_id;
                const totalScore = responseData.total_score;

                const scoreDisplay = document.getElementById('scoreDisplay');
                scoreDisplay.innerHTML = `Survey submitted successfully! Your overall score is <span class="highlight">${totalScore}</span>`;
                scoreDisplay.classList.add('show');

                renderChart(surveyId, answerId);
            } else {
                alert('Error submitting survey.');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing your request.');
        }
    });

    
}

function renderChart(surveyId, answerId){
    fetch(`/survey-data/${surveyId}/${answerId}`)
    .then(response => response.json())
    .then(data => {
        // Prepare data for Chart.js
        const labels = Object.keys(data.surveyStats);
        const avgScores = labels.map(id => data.surveyStats[id].avg_score || 0);
        const medianScores = labels.map(id => data.surveyStats[id].median_score || 0);
        const highestScores = labels.map(id => data.surveyStats[id].highest_score || 0);
        const lowestScores = labels.map(id => data.surveyStats[id].lowest_score || 0);
        const userScores = labels.map(id => {
            const scores = data.userAnswers[id] || [];
            return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        });

        const ctx = document.getElementById('surveyChart').getContext('2d');
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(id => `Question ${id}`),
                datasets: [
                    {
                        label: 'Your Score',
                        data: userScores,
                        backgroundColor: 'rgba(255, 206, 86, 0.2)',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Average Score',
                        data: avgScores,
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Median Score',
                        data: medianScores,
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Highest Score',
                        data: highestScores,
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 1,
                    },
                    {
                        label: 'Lowest Score',
                        data: lowestScores,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: false,
                        barPercentage: 1,
                        categoryPercentage: 1
                        
                    },
                    y: {
                        stacked: false
                        // beginAtZero: true
                    }
                }
            }
        });
    })
    .catch(error => console.error('Error loading survey data:', error));
}





