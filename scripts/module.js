import { PoolPanel } from './poolPanel.js'
import { registerHelpers } from './handlebarHelpers.js'
import { fateReroll, deedsReroll } from './chatMessageHandlers.js';

Hooks.on('init', async() => {
  registerHelpers();
  registerSettings();
  await registerPartials();
})

Hooks.on('ready', () => {

    game.poolPanel = new PoolPanel();
    game.poolPanel.render(true);
    game.poolPanel.socketListen();

    const hotbarEl = $(document.getElementById("hotbar"));
    console.log('hotbarEl position', hotbarEl.position())
    console.log('hotbarEl height', hotbarEl.height())
   

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

async function registerPartials() {

  // Register Handlebars partials from array of file paths
    const partialPaths = [
        'modules/bw-dice-pool/templates/partials/abilitySelector.hbs'
    ];

    for (const partialPath of partialPaths) {
        try {
            const partialTemplate = await fetch(partialPath).then(r => r.text());
            Handlebars.registerPartial(partialPath, partialTemplate);
            console.log(`Registered partial: ${partialPath}`);
        } catch (error) {
            console.error(`Failed to register partial ${partialPath}:`, error);
        }
    }

}
