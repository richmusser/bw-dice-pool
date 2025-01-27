// import { PoolPanel } from '../scripts/poolPanel.js'
// import { registerHelpers } from '../scripts/handlebarHelpers.js'
// import { fateReroll, deedsReroll } from '../scripts/chatMessageHandlers.js';

Hooks.on('init', () => {
  // registerHelpers();
   registerSettings();
})

Hooks.on('ready', () => {

    // game.poolPanel = new PoolPanel();
    // game.poolPanel.render(true);
    // game.poolPanel.socketListen();

    // $(document).on('click', '.fate-reroll', (e)=> {
    //   fateReroll(e.target)     
    // })

    // $(document).on('click', '.deeds-reroll', (e)=> {
    //   deedsReroll(e.target)     
    // })
});

Hooks.on("renderChatLog", (_app: Application, _html: JQuery, _data: any) => {
  console.log("renderChatLog")
//
});

Hooks.on("renderChatMessage", (_app: Application, _html: JQuery, _data: any)=> {
  // console.log("renderChatMessage", app, data)
  // initChatMessage(html)
});

function registerSettings() {
  // game.settings.register('bw-dice-pool', 'obstacle', {
  //   scope: 'world',
  //   type: Number, 
  //   default: 3
  // })

  let g = game as Game

  console.log('****', g.settings)

//  let x = Settings
//∂  console.log(x)
}
