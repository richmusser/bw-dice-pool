import {PoolPanel} from './poolPanel.js'


let diceCount = 1;  // Start with rolling 1 die


Hooks.on('ready', () => {


    game.poolPanel = new PoolPanel();
    game.poolPanel.render(true);

  // Add dice roller button
  const buttonHtml = `
    <div id="dice-roller-container">
      <div id="dice-roller-button" title="Roll Dice">
        <i class="fas fa-dice-d6"></i>
      </div>
      <div id="dice-increase-button" title="Increase Dice Count">
        <i class="fas fa-plus"></i>
      </div>
      <div id="dice-count-display" title="Number of Dice">
        <span>${diceCount}</span>
      </div>
    </div>
  `;

  $('body').append(buttonHtml);

  // Handle dice rolling
  $('#dice-roller-button').on('click', async() => {
    const roll = new Roll(`${diceCount}d6`, {})

    console.log(roll.terms);

     await roll.evaluate({async:true});
    // console.log(roll.result);
    // console.log(roll.total); 

    const pool = PoolTerm.fromRolls([roll]);
    let rollx = Roll.fromTerms([pool]);

rollx.toMessage();


    // const successes = roll.dice[0].results.filter(die => die.result >= 4).length;
    // const successMessage = `Rolled ${diceCount}d6: ${successes} Success${successes === 1 ? '' : 'es'}`;
    // ChatMessage.create({
    //   content: successMessage,
    //   speaker: ChatMessage.getSpeaker()
    // });
  });

  // Handle increasing the number of dice
  $('#dice-increase-button').on('click', () => {
    diceCount++;
    $('#dice-count-display span').text(diceCount);
  });
});

Hooks.on('renderHeadsUpDisplay', (hud, html) => {
  const container = html.find('#dice-roller-container');
  if (!container.length) {
    const buttonHtml = `
      <div id="dice-roller-container">
        <div id="dice-roller-button" title="Roll Dice">
          <i class="fas fa-dice-d6"></i>
        </div>
        <div id="dice-increase-button" title="Increase Dice Count">
          <i class="fas fa-plus"></i>
        </div>
        <div id="dice-count-display" title="Number of Dice">
          <span>${diceCount}</span>
        </div>
      </div>
    `;
    html.append(buttonHtml);
  }
});
