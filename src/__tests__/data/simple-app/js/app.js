document.addEventListener('DOMContentLoaded', function() {
  console.log('JavaScript is running');

  // Example of dynamic content insertion
  const mainContent = document.querySelector('main');
  const newParagraph = document.createElement('p');
  newParagraph.textContent = 'This content was added dynamically by JavaScript!';
  mainContent.appendChild(newParagraph);

  // Example of event listener
  document.querySelector('header img').addEventListener('click', function() {
    alert('Header logo clicked! 💛');
  });
});