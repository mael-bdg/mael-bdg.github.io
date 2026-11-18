const languageButton = document.querySelector('.language');
const translatedElements = [...document.querySelectorAll('[data-en]')];
const frenchText = translatedElements.map((element) => element.textContent);
const titles = {
  fr: 'Maëlys Badger — Développeuse web',
  en: 'Maëlys Badger — Web developer',
};

languageButton.addEventListener('click', () => {
  const language = document.documentElement.lang === 'fr' ? 'en' : 'fr';
  document.documentElement.lang = language;
  document.title = titles[language];
  languageButton.textContent = language === 'en' ? 'FR' : 'EN';
  languageButton.setAttribute('aria-label', language === 'en' ? 'Afficher en français' : 'Switch to English');
  translatedElements.forEach((element, index) => {
    element.textContent = language === 'en' ? element.dataset.en : frenchText[index];
  });
});
