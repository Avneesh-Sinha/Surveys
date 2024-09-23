document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('createSurveyBtn').addEventListener('click', () => {
        window.location.href = '/create-survey';
    });

    document.getElementById('fillSurveyBtn').addEventListener('click', () => {
        window.location.href = '/fill-survey';
    });
});
