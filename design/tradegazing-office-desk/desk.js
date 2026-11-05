const views = {
  fleet: ['Controlling', 'Fleet Control'],
  nova: ['Controlling', 'Fleet Control / Nova'],
  missions: ['Projektmanagement', 'Mission Log'],
  context: ['Projektmanagement', 'Context Core'],
  bugs: ['Projektmanagement', 'Bug Board'],
  legal: ['Projektmanagement', 'Legal & Lizenzen'],
};

const destinations = { orion: 'fleet', 'nova-risk': 'nova' };
const menu = document.querySelector('.menu');
const mobile = matchMedia('(max-width: 800px)');
const breadcrumb = document.getElementById('breadcrumb');
const menuCurrent = document.getElementById('menu-current');
const themeButton = document.getElementById('theme');

function updateMenu() {
  menu.open = !mobile.matches;
}

function showView(moveFocus = false) {
  const hash = location.hash.slice(1);
  if (hash === 'main') return;
  const hasTarget = Object.hasOwn(destinations, hash);
  const route = hasTarget ? destinations[hash] : Object.hasOwn(views, hash) ? hash : 'fleet';
  const [area, title] = views[route];
  const current = route === 'nova' ? 'fleet' : route;

  for (const name of Object.keys(views)) {
    document.getElementById('view-' + name).hidden = name !== route;
  }
  for (const link of menu.querySelectorAll('a')) {
    if (link.hash === '#' + current) {
      link.setAttribute('aria-current', route === 'nova' ? 'location' : 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  }

  const separator = document.createElement('span');
  separator.textContent = '/';
  breadcrumb.replaceChildren(area, separator, title);
  menuCurrent.textContent = title;
  document.title = title + ' · Tradegazing Office Desk';
  updateMenu();

  if (hasTarget) {
    const target = document.getElementById(hash);
    if (moveFocus) target.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start' });
  } else if (moveFocus) {
    document.getElementById('title-' + route).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.textContent = theme === 'dark' ? 'Helles Design' : 'Dunkles Design';
}

mobile.addEventListener('change', updateMenu);
window.addEventListener('hashchange', () => showView(true));
document.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !link.hash || link.hash !== location.hash || link.hash === '#main') return;
  event.preventDefault();
  showView(true);
});
themeButton.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});
showView();
