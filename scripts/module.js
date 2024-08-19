import { PoolPanel } from './poolPanel.js'
import { registerHelpers } from './handlebarHelpers.js'


Hooks.on('init', () => {
  registerHelpers();

  registerSettings();
})


Hooks.on('ready', () => {

    game.poolPanel = new PoolPanel();
    game.poolPanel.render(true);
    game.poolPanel.socketListen();

    $(document).on('click', '.fate-reroll', ()=> {
      console.log("Fate reroll clicked")
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
