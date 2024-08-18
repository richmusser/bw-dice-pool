import { PoolPanel } from './poolPanel.js'
import { registerHelpers } from './handlebarHelpers.js'

Hooks.on('init', () => {
  registerHelpers();
})


Hooks.on('ready', () => {

    game.poolPanel = new PoolPanel();
    game.poolPanel.render(true);

});


