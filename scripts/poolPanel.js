import { shadeToTarget, shadeLabel } from './shadeUtils.js'
import { BwDicePool } from './BwDicePool.js'

const SOCKET_NAME = 'module.bw-dice-pool'

export class PoolPanel extends Application {

  numDice = 4
  ob = 3
  shade = 'B'
  isBloodyVs = false
  attackDice = 0
  defendDice = 0

  shades = ['B', 'G', 'W']
  shadeIndex = 0
  usingPersona = false

  numPersona = 0
  personaMode = false

  abilityName = ''
  abilityExponent = 0
  abilityShade = ''

  recentAbilities = []


  constructor(mods, help) {
    super({
      template: "modules/bw-dice-pool/templates/poolPanel.hbs",
      popOut: false,
    });

    try {
      this.ob = game.settings.get('bw-dice-pool', 'obstacle')
    }
    catch (err) {
      console.error('Error getting obstacle setting: ' + err)
    }
  }

  activateListeners(html) {
    html.find('.dice-increase-button').on('click', () => {
      if(this.personaMode) {
        if(this.numPersona < 3){
          this.numPersona++
          this.render();  
        }
      }
      else {
        this.numDice++
        if (this.isBloodyVs) {
          // Add new dice to attack pool by default
          this.attackDice++
        }
        this.render();  
      }
    })

    html.find('.dice-decrease-button').on('click', () => {
      if(this.personaMode) {
        if(this.numPersona > 0) {
          this.numPersona--
        }
      }
      else {
        if (this.numDice > 1) {
          this.numDice--
          if (this.isBloodyVs) {
            // Remove from attack pool first if possible
            if (this.attackDice > 0) {
              this.attackDice--
            } else {
              // If attack pool is empty, remove from defence pool
              this.defendDice--
            }
          }
        }
      }
      this.render();
    })

    html.find('.attack-increase-button').on('click', () => {
      if (this.attackDice < this.numDice) {
        this.attackDice++
        this.defendDice = this.numDice - this.attackDice
        this.render()
      }
    })

    html.find('.attack-decrease-button').on('click', () => {
      if (this.attackDice > 0) {
        this.attackDice--
        this.defendDice = this.numDice - this.attackDice
        this.render()
      }
    })

    html.find('.defend-increase-button').on('click', () => {
      if (this.defendDice < this.numDice) {
        this.defendDice++
        this.attackDice = this.numDice - this.defendDice
        this.render()
      }
    })

    html.find('.defend-decrease-button').on('click', () => {
      if (this.defendDice > 0) {
        this.defendDice--
        this.attackDice = this.numDice - this.defendDice
        this.render()
      }
    })

    html.find('.roll').on('click', async () => {
      await this.rollPool({ open: false });
    //  this.render();
    })

    html.find('.roll-open').on('click', async () => {
      await this.rollPool({ open: true });
    //  this.render();
    })

    html.find('.roll-dof').on('click', async () => {
      await this.rollDieOfFate();
    //  this.render();
    })

    html.find('.split-pool').on('click', (event) => {
      console.log('Split pool button clicked');
      this.isBloodyVs = !this.isBloodyVs;
      console.log('isBloodyVs:', this.isBloodyVs);
      
      const panel = document.getElementById('bw-dice-pool');
      if (this.isBloodyVs) {
        panel.classList.add('expanded');
        // Initialize split pool with equal distribution
        this.attackDice = Math.floor(this.numDice / 2);
        this.defendDice = this.numDice - this.attackDice;
        this.ob = 1;
      } else {
        panel.classList.remove('expanded');
        // Reset split pool
        this.attackDice = 0;
        this.defendDice = 0;
      }
      
      console.log('Panel classes after toggle:', panel.classList);
      this.render(true);
    })

    html.find('.btn-shade').on('click', (elem) => {
      this.cycleShade();
      this.render();
      // console.log('shade click', elem.currentTarget)
      // $(elem.currentTarget).addClass('active')
    })

    html.find('.btn-ob-increase').on('click', () => {
      this.changeOb(this.ob + 1);
    })

    html.find('.btn-ob-decrease').on('click', () => {
      this.changeOb(this.ob - 1);
    })

    html.find('.btn-persona').on('click', () => {
      this.personaMode = !this.personaMode
      this.render()
    })

    const abilitySelect = html.find('#ability-select')[0]; 

    // Add an event listener for the 'change' event
    abilitySelect.addEventListener('change', (event) => {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const exponent = selectedOption.getAttribute('data-exponent'); 
        const shade = selectedOption.getAttribute('data-shade');
        const name = selectedOption.value;
        this.handleAbilitySelected(name, exponent, shade);
    });
  }

  socketListen() {
    game.socket.on(SOCKET_NAME, ({ type, ob }) => {
      console.log("ON SOCKET", type, ob)
      if (type === "obChanged") {
        this.ob = ob;
        this.render(true);
      }
    });
  }

  changeOb(ob) {

    if (ob < 1) {
      ob = 1;
    }
    this.ob = ob

    this.render();
    this.sendObChangedEvent(this.ob)
    game.settings.set('bw-dice-pool', 'obstacle', ob)
  }

  sendObChangedEvent(ob) {
    game.socket.emit(SOCKET_NAME, { type: "obChanged", ob: ob })
  }

  getShade() {
    return this.shades[this.shadeIndex]
  }

  getData() {

    const data = super.getData();

    this.addAbilitiesToRenderData(data);
   
    data.abilityName = this.abilityName;

    data.numDice = this.numDice;
    data.renderDice = data.numDice < 10
    data.ob = this.ob
    data.shade = shadeLabel(this.getShade())
    data.isGm = game.user.isGM
    data.numPersona = this.numPersona
    data.personaMode = this.personaMode
    data.flushToBottom = true
    data.attackDice = this.attackDice
    data.defendDice = this.defendDice
    data.isBloodyVs = this.isBloodyVs
    data.renderAttackDice = this.attackDice < 10
    data.renderDefendDice = this.defendDice < 10

    console.log("BW Dice Pool Data", data)

    return data;
  }

  cycleShade() {
    this.shadeIndex++;
    if (this.shadeIndex >= this.shades.length)
      this.shadeIndex = 0;
  }

  async rollPool({ open }) {
    if (this.isBloodyVs) {
      // Roll attack pool
      let attackPool = new BwDicePool(this.getShade(), this.attackDice, open, this.ob, 0)
      await attackPool.roll()

      const attackChatData = {
        ...attackPool.data,
        allowFate: open || attackPool.data.sixes,
        allowDeeds: true,
        didDeeds: false,
        didFate: false,
        rerollLabel: 'Attack Roll: ',
        abilityName: this.abilityName,
        abilityShade: this.abilityShade,
        abilityExponent: this.abilityExponent ? this.abilityExponent : ''
      }

      attackChatData.json = JSON.stringify(attackChatData)

      let attackMessage = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", attackChatData);
      await ChatMessage.create({
        content: attackMessage,
        speaker: ChatMessage.getSpeaker()
      });

      // Roll defend pool
      let defendPool = new BwDicePool(this.getShade(), this.defendDice, open, this.ob, 0)
      await defendPool.roll()

      const defendChatData = {
        ...defendPool.data,
        allowFate: open || defendPool.data.sixes,
        allowDeeds: true,
        didDeeds: false,
        didFate: false,
        rerollLabel: 'Defend Roll: '
      }

      defendChatData.json = JSON.stringify(defendChatData)

      let defendMessage = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", defendChatData);
      await ChatMessage.create({
        content: defendMessage,
        speaker: ChatMessage.getSpeaker()
      });
    } else {
      // Original single pool roll
      let pool = new BwDicePool(this.getShade(), this.numDice + this.numPersona, open, this.ob, this.numPersona)
      await pool.roll()

      const chatData = {
        ...pool.data,
        allowFate: open || pool.data.sixes,
        allowDeeds: true,
        didDeeds: false,
        didFate: false, 
        abilityName: this.abilityName,
        abilityShade: this.abilityShade,
        abilityExponent: this.abilityExponent ? this.abilityExponent : ''
      }

      chatData.json = JSON.stringify(chatData)

      let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
      await ChatMessage.create({
        content: message,
        speaker: ChatMessage.getSpeaker()
      });
    }

    this.usingPersona = false;

    this.afterAbilityRoll();

    this.render();
  }

  afterAbilityRoll() {

    if(!this.abilityName) {
      return;
    }
    
    // Remove any existing ability with the same name
    this.recentAbilities = this.recentAbilities.filter(ability => this.abilityName !== ability.name);

    this.recentAbilities.unshift({
      name: this.abilityName,
      exponent: this.abilityExponent,
      shade: this.abilityShade
    })

    if(this.recentAbilities.length > 5) {
      this.recentAbilities.pop(); 
    }

    this.abilityName = '';

  }

  async rollDieOfFate(){
    const roll = await new Roll(`1d6`).evaluate({ async: true });
    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true, null, false)
        .then(_ => roll);
    }

    let chatData = {
      value: roll.terms[0].results[0].result
    }

    let message = await renderTemplate("modules/bw-dice-pool/templates/chatDieOfFate.hbs", chatData);
    await ChatMessage.create({
      content: message,
      speaker: ChatMessage.getSpeaker()
    });

    return chat
  }


  findTestDifficulty(dice, ob) {

    if (ob > dice) {
      return 'Challenging'
    }
    else if (dice === 1) {
      return 'Routine/Difficult'
    }
    else if (dice <= 3) {
      if (ob === dice)
        return 'Difficult'
      else
        return 'Routine'
    }
    else if (dice <= 7) {
      if (dice - ob <= 1)
        return 'Difficult'
      else
        return 'Routine'
    }
    else {
      if (dice - ob <= 2)
        return 'Difficult'
      else
        return 'Routine'
    }
  }

  getActor() {
        // Get the first controlled token's actor
        // This assumes that the user has at least one token controlled
        // If no tokens are controlled, it will return undefined

      let controlledTokens = canvas.tokens.controlled;
      console.log("Controlled Tokens:", controlledTokens);

    if (controlledTokens.length > 0) {
      let firstControlledToken = controlledTokens[0];
      let actor = firstControlledToken.actor;
      console.log("The actor of the first controlled token is:", actor);
      return actor; // Return the actor object
      // You can then work with the 'actor' object, e.g., actor.name, actor.system.hp.value
    } else {
      console.log("No tokens are currently controlled by the user.");
      return null;
    }
  }

  addAbilitiesToRenderData(data) {

     const actor = this.getActor();
    console.log("Current Actor?", actor);
    if (actor && actor?.system?.skills) { 
      console.log("Current Actor:", actor);
      this.addActorAbilitiesToRenderData(actor, data);
    }
    else {
      this.addDefaultAbilitiesToRenderData(data);
    }
    

  }

  addActorAbilitiesToRenderData(actor, data) {
    if(!actor) {
      return;
    }

    if(actor?.system?.skills) {
      let skills = actor.system.skills;
      // get the skills which are stored as keys on the skills object
       let skillsFiltered = Object.keys(skills).map(key => skills[key]).filter(skill => !!skill.name);
      data.skills = skillsFiltered.map(skill => {
        return {
          name: skill.name,
          exponent: skill.exponent,
          shade: skill.shade
        };
      });

      if(actor?.system?.attributes) {
        let attributes = actor.system.attributes;
        // get the abilities which are stored as keys on the abilities object
        let attributesMapped = Object.keys(attributes).map(attributeName => {
          let attribute = attributes[attributeName];
          return {
            name: this.formatAbilityName(attributeName),
            exponent: attribute.exponent, 
            shade: attribute.shade
          };
        })

        data.attributes = attributesMapped        
      }

      if(actor?.system?.stats) {
        let stats = actor.system.stats;
        // get the abilities which are stored as keys on the abilities object
        let statsMapped = Object.keys(stats).map(statName => {
          let stat = stats[statName];
          return {
            name: this.formatAbilityName(statName),
            exponent: stat.exponent, 
            shade: stat.shade
          };
        })

        data.stats = statsMapped        
      }

      if(actor?.system?.gear?.armor) {
        let armor = actor.system.gear.armor;
        // get the abilities which are stored as keys on the abilities object
        let armorMapped = Object.keys(armor).map(armorName => {
          let armorData = armor[armorName];
          if(!armorData || !armorData.dice) {
            return {};
          }
          //the exponent of armor is from an object with boolean keys and the sum of the values
          let armorDice = Object.keys(armorData.dice).reduce((sum, key) => {
            return sum + (armorData.dice[key] ? 1 : 0);  
          }, 0);

          let armorLabel = `${armorName} Armor`;
          if(armorData.type) {
            armorLabel += ` (${armorData.type})`;
          }

          return {
            name: this.formatAbilityName(armorLabel),
            exponent: armorDice, 
            shade: 'B'
          };
        })

        data.armor = armorMapped.filter(armor => !!armor.name);       
      }

      data.recentAbilities = this.recentAbilities;
    }
  }

  addDefaultAbilitiesToRenderData(data) {

    data.skills = [
      { name: 'Savage Attack'},
      { name: 'Melee Weapon' },
      { name: 'Ranged Weapon' },
      { name: 'Sword' },
      { name: 'Spear' }, 
      { name: 'Bow' },
      { name: 'Crossbow' },
      { name: 'Brawling' },
      { name: 'Mace' },
      { name: 'Knife'},
      { name: 'Axe' },
      { name: 'Sorcery'},
      { name: 'Stealth' }      
    ];

    data.stats = [
      { name: 'Will' },
      { name: 'Power' },
      { name: 'Agility' },
      { name: 'Perception' },
      { name: 'Forte' },
      { name: 'Speed' }
    ]

    data.attributes = [
      { name: 'Health' },
      { name: 'Steel' },
      { name: 'Reflexes' },
      { name: 'Mortal Wounds' }
    ];

    data.armor = [
      { name: 'Gambeson', exponent: 1, shade: 'B' },
      { name: 'Reinforced Leather', exponent: 2, shade: 'B' },
      { name: 'Light Mail', exponent: 3, shade: 'B' },
      { name: 'Heavy Mail', exponent: 4, shade: 'B' },
      { name: 'Plate Armor', exponent: 5, shade: 'B' },
      { name: 'Full Plate', exponent: 6, shade: 'B' },
      { name: 'Thick Hide', exponent: 1, shade: 'B' },
      { name: 'Tough Hide', exponent: 2, shade: 'B' },
      { name: 'Scaled Skin', exponent: 1, shade: 'B' },
      { name: 'Stone Skin', exponent: 4, shade: 'B' },
      { name: 'Buckler', exponent: 1, shade: 'B' },
      { name: 'Target Shield', exponent: 2, shade: 'B' },
      { name: 'Heater Shield', exponent: 3, shade: 'B' },
      { name: 'Great Shield', exponent: 4, shade: 'B' }
    ];

    data.recentAbilities = this.recentAbilities;

  }

  handleAbilitySelected(name, exponent, shade) {
    console.log("Selected ability:", name, exponent, shade);

    if(!name) {
      this.abilityName = '';
      return;
    };

    this.abilityName = name; 
  
    if(exponent && !isNaN(exponent)) {
      let numericExponent = parseInt(exponent, 10) || 1;;

      if(this.isBloodyVs) {
        this.attackDice = numericExponent;
        this.defendDice = 0;
      }

      this.numDice = numericExponent;
      this.abilityExponent = exponent;
    }
    else {
      this.abilityExponent = 0;
    }

    if(shade && this.shades.includes(shade)) {
      this.shadeIndex = this.shades.indexOf(shade) !== -1 ? this.shades.indexOf(shade) : 0; // Default to first shade if not found
      this.abilityShade = shade;
    }
    else {
      this.abilityShade = '';
    }

    
    this.render();
  }

  formatAbilityName(name) {
    // Convert the name to a more readable format
    let capitalized =  name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');

     return capitalized.replace(/([a-z0-9])([A-Z])/g, '$1 $2') // Split camelCase or PascalCase
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Handle acronyms
           
  }
}

Hooks.on("updateActor", (actor, changed, options, userId) => {

  console.log("Actor updated", actor, changed, options, userId);
  game.poolPanel.render(true);

  // if (game.poolPanel && game.poolPanel.getActor()?.id === actor.id) {
  //   console.log("Actor updated, re-rendering pool panel");
  //   game.poolPanel.render(true);
  // }
});

Hooks.on("controlToken", (token, controlled) => {
  if (controlled) {
    // A token was selected
    console.log(`Token ${token.name} was selected.`);
       game.poolPanel.render(true);

    // Your custom logic for when a token is selected
  } else {
    // A token was deselected
    console.log(`Token ${token.name} was deselected.`);
    // Your custom logic for when a token is deselected
  }


});