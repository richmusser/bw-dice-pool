import { PoolPanel } from './poolPanel.js'
import { registerHelpers } from './handlebarHelpers.js'
import { fateReroll, deedsReroll } from './chatMessageHandlers.js';

Hooks.on('init', () => {
  registerHelpers();
  registerSettings();
})

Hooks.on('ready', () => {

    game.poolPanel = new PoolPanel();
    game.poolPanel.render(true);
    game.poolPanel.socketListen();

    $(document).on('click', '.fate-reroll', (e)=> {
      fateReroll(e.target)     
    })

    $(document).on('click', '.deeds-reroll', (e)=> {
      deedsReroll(e.target)     
    })
});

Hooks.on("renderChatLog", (_app, html, _data) => {
  console.log("renderChatLog")
//
});

Hooks.on("renderChatMessage", (app, html, data) => {
  // console.log("renderChatMessage", app, data)
  // initChatMessage(html)
});

function registerSettings() {
  game.settings.register('bw-dice-pool', 'obstacle', {
    scope: 'world',
    type: Number, 
    default: 3
  })
}
