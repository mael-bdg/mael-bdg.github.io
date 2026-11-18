// Liens directs vers les dépôts publics. Les repères sans dépôt ouvrent la fiche locale.
const repositoryPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/i;

document.querySelectorAll('[data-project-pin]').forEach((pin) => {
  const projectId = pin.dataset.projectPin;
  const repository = projectRepositories[projectId]?.trim();
  if (!repository || !repositoryPattern.test(repository)) return;

  const card = document.getElementById(projectId);
  const heading = card.querySelector('h3');
  const title = document.createElement('span');
  title.textContent = heading.textContent;
  if (heading.dataset.en) {
    title.dataset.en = heading.dataset.en;
    heading.removeAttribute('data-en');
  }

  const link = document.createElement('a');
  link.className = 'repository-link';
  link.href = repository;
  link.append(title);

  const hint = document.createElement('span');
  hint.className = 'repository-hint';
  hint.textContent = 'Code sur GitHub';
  hint.dataset.en = 'Source on GitHub';
  link.append(hint);

  heading.replaceChildren(link);
  pin.href = repository;
  card.classList.add('card-linked');
});
