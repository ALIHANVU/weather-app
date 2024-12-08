document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        document.querySelector('.app-container').classList.toggle('dark-theme');
        Array.from(document.querySelectorAll('input, button')).forEach(element => {
            element.classList.toggle('dark-theme');
        });
    });
});
