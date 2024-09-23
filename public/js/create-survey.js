let sectionCount = 0;
document.getElementById('addSectionBtn').addEventListener('click', () => {
    sectionCount++;
    const section = document.createElement('div');
    section.innerHTML = `
        <h3>Section ${sectionCount}</h3>
        <input type="text" id="surveyTextbox" name="section_name_${sectionCount}" placeholder="Section name">
        <div id="questionsContainer_${sectionCount}">
            <h4>Questions</h4>
            <button type="button" onclick="addQuestion(${sectionCount})">Add Question</button>
        </div>
    `;
    document.getElementById('sectionsContainer').appendChild(section);
});

function addQuestion(sectionId) {
    const questionsContainer = document.getElementById(`questionsContainer_${sectionId}`);
    const questionCount = questionsContainer.querySelectorAll('div.question').length + 1; // Count existing questions
    const question = document.createElement('div');
    question.className = 'question'; // Add class for styling
    question.innerHTML = `
        <label>Question ${questionCount}</label>
        <input type="text" id="surveyTextbox" name="question_${sectionId}[]" required>
        <select name="question_type_${sectionId}_${questionCount}">
            <option value="text">Text</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="numeric">Numeric</option>
        </select>
        <div class="optionsContainer">
            <label>Options</label>
        </div>
        <button type="button" onclick="addOption(this)">Add Option</button>
    `;
    questionsContainer.appendChild(question);
}

function addOption(button) {
    const optionsContainer = button.previousElementSibling; // Get the optionsContainer
    const optionCount = optionsContainer.querySelectorAll('input.option').length + 1; // Count existing options
    const option = document.createElement('div');
    
    option.className = 'option'; // Add class for styling
    option.innerHTML = `
        <input type="text" id="surveyTextbox" name="option_${optionCount}" placeholder="Option" required style="margin-bottom: 0px;">
    `;
    
    optionsContainer.appendChild(option);
}

document.getElementById('surveyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Initialize survey data object
    const surveyData = {
        title: document.getElementById('surveyTitle').value,
        created_by_user_id: document.getElementById('createdByUserId').value,
        sections: []
    };

    // Collect sections
    const sectionElements = document.querySelectorAll('#sectionsContainer > div');
    sectionElements.forEach(sectionDiv => {
        const section = {
            name: sectionDiv.querySelector('input[name^="section_name_"]').value,
            questions: []
        };

        // Collect questions for each section
        const questionElements = sectionDiv.querySelectorAll('div[id^="questionsContainer_"] > div');
        questionElements.forEach(questionDiv => {
            const question = {
                text: questionDiv.querySelector('input[name^="question_"]').value,
                type: questionDiv.querySelector('select[name^="question_type_"]').value, // Get question type
                options: []
            };

            // Collect options for each question
            const optionElements = questionDiv.querySelectorAll('input[name^="option_"]');
            optionElements.forEach(optionInput => {
                if (optionInput.value) {
                    question.options.push({ text: optionInput.value });
                }
            });

            section.questions.push(question);
        });

        surveyData.sections.push(section);
    });

    // Send survey data to the server
    try {
        const response = await fetch('/create-survey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(surveyData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Survey saved:', result);

    } catch (error) {
        console.error('Error submitting survey:', error);
    }
});
