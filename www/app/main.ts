import {
  figure,
  render,
  createElement,
} from './deps.ts';

import App from './app.ts';

figure({ createElement })

const root = document.querySelector('#root');
render(createElement(App), root);
