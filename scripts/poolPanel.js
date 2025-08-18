import { shadeToTarget, shadeLabel } from './shadeUtils.js'
import { getActor } from './getActor.js'
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

  abilityLabel = ''
  abilityName = ''
  abilityExponent = 0
  abilityShade = ''
  abilityType = ''
  abilityCanProgress = false

  weaponName = ''
  weaponJson = ''

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
        const exponent = parseInt(selectedOption.getAttribute('data-exponent'), 10);
        const shade = selectedOption.getAttribute('data-shade');
        const type = selectedOption.getAttribute('data-type');
        const label = selectedOption.getAttribute('data-label');
        const canProgress = selectedOption.getAttribute('data-canprogress') == 'true'
        const name = selectedOption.value;
        this.handleAbilitySelected(name, label, exponent, shade, type, canProgress);
    });

    const weaponSelect = html.find('#weapon-select')[0];

    weaponSelect.addEventListener('change', (event) => {
      const selectedOption = event.target.options[event.target.selectedIndex];
      const weaponJson = selectedOption.getAttribute('data-json');
      const weaponName = selectedOption.value;
      this.handleWeaponSelected(weaponName, weaponJson);
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
    this.addWeaponsToRenderData(data);
    this.addWoundsToRenderData(data);
   
    data.abilityName = this.abilityName;
    data.weaponName = this.weaponName;

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
        abilityLabel: this.abilityLabel,
        abilityShade: this.abilityShade,
        abilityExponent: this.abilityExponent ? this.abilityExponent : '',
        abilityType : this.abilityType,
        abilityCanProgress: this.abilityCanProgress,
        weaponName: this.weaponName,
        weaponData: this.weaponJson ? JSON.parse(this.weaponJson) : ''
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

      console.log("***** Weapon JSON", JSON.parse(this.weaponJson))

      const chatData = {
        ...pool.data,
        allowFate: open || pool.data.sixes,
        allowDeeds: true,
        didDeeds: false,
        didFate: false, 
        abilityName: this.abilityName,
        abilityLabel: this.abilityLabel,
        abilityShade: this.abilityShade,
        abilityExponent: this.abilityExponent ? this.abilityExponent : '',
        abilityType: this.abilityType,
        abilityCanProgress: this.abilityCanProgress,
        weaponName: this.weaponName,
        weaponData: this.weaponJson ? JSON.parse(this.weaponJson) : ''
      }

      chatData.json = JSON.stringify(chatData)

      let message = await renderTemplate("modules/bw-dice-pool/templates/chatRollTemplate.hbs", chatData);
      await ChatMessage.create({
        content: message,
        speaker: ChatMessage.getSpeaker()
      });
    }

    this.usingPersona = false;

    this.afterRollResetAbility();
    this.afterRollResetWeapons();

    this.render();
  }

  afterRollResetAbility() {

    if(!this.abilityName) {
      return;
    }
    
    // Remove any existing ability with the same name
    this.recentAbilities = this.recentAbilities.filter(ability => this.abilityName !== ability.name);

    this.recentAbilities.unshift({
      label: this.abilityLabel,
      name: this.abilityName,
      exponent: this.abilityExponent,
      shade: this.abilityShade,
      canProgress: this.abilityCanProgress,
      type: this.abilityType
    })

    if(this.recentAbilities.length > 5) {
      this.recentAbilities.pop(); 
    }

    // this.abilityName = '';
    // this.abilityType = '';
    // this.abilityLabel = '';
  }

  afterRollResetWeapons() {
   // this.weaponJson = '';
  //  this.weaponName = '';
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

  addAbilitiesToRenderData(data) {
    const actor = getActor();
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
          name: skill.name.trim(),
          label: skill.name.trim(),
          exponent: skill.exponent,
          shade: skill.shade,
          type: 'skills',
          canProgress: true
        };
      });

      if(actor?.system?.attributes) {
        let attributes = actor.system.attributes;
        // get the abilities which are stored as keys on the abilities object
        let attributesMapped = Object.keys(attributes).map(attributeName => {
          let attribute = attributes[attributeName];
          return {
            label: this.formatAbilityName(attributeName),
            name: attributeName,
            exponent: attribute.exponent, 
            shade: attribute.shade,
            type: 'attributes',
            canProgress: true
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
            label: this.formatAbilityName(statName),
            name: statName,
            exponent: stat.exponent, 
            shade: stat.shade,
            type: 'stats',
            canProgress: true
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

          let armorLabel = `${armorName}`;
          if(armorData.type) {
            armorLabel += ` (${armorData.type})`;
          }

          return {
            label: this.formatAbilityName(armorLabel),
            name: armorName,
            exponent: armorDice, 
            shade: 'B',
            type: 'armor',
            canProgress: false
          };
        })

        data.armor = armorMapped.filter(armor => !!armor.name);       
      }

      data.recentAbilities = this.recentAbilities;
    }
  }

  addDefaultAbilitiesToRenderData(data) {

    data.skills = [
      { name: 'Savage Attack', label: 'Savage Attack', canProgress: false },
      { name: 'Melee Weapon', label: 'Melee Weapon', canProgress: false },
      { name: 'Ranged Weapon', label: 'Ranged Weapon', canProgress: false },  
      { name: 'Sword', label: 'Sword', canProgress: false },
      { name: 'Spear', label: 'Spear', canProgress: false }, 
      { name: 'Bow', label: 'Bow', canProgress: false },
      { name: 'Crossbow', label: 'Crossbow', canProgress: false },
      { name: 'Brawling', label: 'Brawling', canProgress: false },
      { name: 'Mace', label: 'Mace', canProgress: false },
      { name: 'Knife', label: 'Knife', canProgress: false },
      { name: 'Axe', label: 'Axe', canProgress: false },
      { name: 'Sorcery', label: 'Sorcery', canProgress: false },
      { name: 'Stealth', label: 'Stealth', canProgress: false },      
    ];

    data.stats = [
      { name: 'Will', label: 'Will', canProgress: false },
      { name: 'Power', label: 'Power', canProgress: false },
      { name: 'Agility', label: 'Agility', canProgress: false },
      { name: 'Perception', label: 'Perception', canProgress: false },
      { name: 'Forte', label: 'Forte', canProgress: false },
      { name: 'Speed', label: 'Speed', canProgress: false },
    ]

    data.attributes = [
      { name: 'Health', label: 'Health' },
      { name: 'Steel', label: 'Steel' },
      { name: 'Reflexes', label: 'Reflexes' },
      { name: 'Mortal Wounds', label: 'Mortal Wounds' },
    ];

    data.armor = [
      { name: 'Gambeson', label: 'Gambeson', exponent: 1, shade: 'B', canProgress: false },
      { name: 'Reinforced Leather', label: 'Reinforced Leather', exponent: 2, shade: 'B', canProgress: false },
      { name: 'Light Mail', label: 'Light Mail', exponent: 3, shade: 'B', canProgress: false },
      { name: 'Heavy Mail', label: 'Heavy Mail', exponent: 4, shade: 'B', canProgress: false },
      { name: 'Plate Armor', label: 'Plate Armor', exponent: 5, shade: 'B', canProgress: false },
      { name: 'Full Plate', label: 'Full Plate', exponent: 6, shade: 'B', canProgress: false },
      { name: 'Thick Hide', label: 'Thick Hide', exponent: 1, shade: 'B', canProgress: false },
      { name: 'Tough Hide',label: 'Tough Hide', exponent: 2, shade: 'B', canProgress: false },
      { name: 'Scaled Skin', label: 'Scaled Skin', exponent: 1, shade: 'B' , canProgress: false},
      { name: 'Stone Skin', label: 'Stone Skin', exponent: 4, shade: 'B', canProgress: false },
      { name: 'Buckler', label: 'Buckler', exponent: 1, shade: 'B', canProgress: false },
      { name: 'Target Shield', label: 'Target Shield', exponent: 2, shade: 'B', canProgress: false },
      { name: 'Heater Shield', label: 'Heater Shield', exponent: 3, shade: 'B', canProgress: false },
      { name: 'Great Shield', label: 'Great Shield', exponent: 4, shade: 'B', canProgress: false }
    ];

    data.recentAbilities = this.recentAbilities;

  }

  handleAbilitySelected(name, label, exponent, shade, type, canProgress) {
    console.log("Selected ability:", name, exponent, shade, type, canProgress);

    if(!name) {
      this.abilityName = '';
      return;
    };

    this.abilityName = name;
    this.abilityLabel = label;
    this.abilityType = type;
    this.abilityCanProgress = canProgress;
  
    if(exponent ) {
      if(this.isBloodyVs) {
        this.attackDice = exponent;
        this.defendDice = 0;
      }

      this.numDice = exponent;
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
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2').trim() // Handle acronyms           
  }

  addWeaponsToRenderData(data) {
    const actor = getActor();
    console.log("Current Actor?", actor);
    if (actor && actor?.system?.skills) { 
      console.log("Current Actor:", actor);
      this.addActorWeaponsToRenderData(actor, data);
    }
    else {
      this.addDefaultWeaponstoRenderData(data);
    }
  }

  addActorWeaponsToRenderData(actor, data) {
    if(!actor) {
      return;
    }

    let allWeapons = [];

    if(actor?.system?.gear?.weapons) {
      let weapons =actor?.system?.gear?.weapons;

      console.log("Actor weapons:", weapons);

      let actorPower = actor?.system?.stats?.power?.exponent || 0;
      if(!actorPower) {
        return;
      }

      // get the weapons which are stored as keys on the weapons object
      let weaponsFiltered = Object.keys(weapons).map(key => weapons[key]).filter(weapon => !!weapon.name);
      allWeapons = weaponsFiltered.map(weapon => {

        console.log("Weapon data:", weapon);

        const basePower = actorPower + weapon.pow;
        const data= {
          name: weapon.name?.trim(),
          label: weapon.name?.trim(),
          i:  Math.ceil(basePower/2),
          m: basePower, 
          s: Math.floor(basePower * 1.5),
          shade: weapon.shade ?? 'B',
          type: 'weapons',
          va: weapon.va,
          ws: weapon.ws,
          add: weapon.add,
          length: weapon.length
        };
  
        const jsonData = JSON.stringify(data);
        return {...data, json: jsonData };
      });
    }

    if(actor?.system?.gear?.rangedWeapons) {
      let weapons =actor?.system?.gear?.rangedWeapons;
      // get the weapons which are stored as keys on the weapons object
      let weaponsFiltered = Object.keys(weapons).map(key => weapons[key]).filter(weapon => !!weapon.name);
      allWeapons.push(...weaponsFiltered.map(weapon => {
        const data = {
          name: weapon.name?.trim(),
          label: weapon.name?.trim(),
          i: weapon.dofI,
          m: weapon.dofM, 
          s: weapon.dofS,
          shade: weapon.shade ?? 'B',
          add: '1/2',
          type: 'rangedWeapons',
          ws: '-',
          va: weapon.va,
          length: `${weapon.optimalRange} / ${weapon.extremeRange}`
        };

        console.log("Weapon data:", data);

        console.log("WEAPON", weapon)

        const jsonData = JSON.stringify(data);
        return {...data, json: jsonData };

      }));
    }

    data.weapons = allWeapons;
  }

  addDefaultWeaponstoRenderData(data) {
    let allWeapons = [
      { name: 'Claw', label: 'Claw', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 1, ws: 3, add: '2', length: 'Shortest' },
      { name: 'Bite', label: 'Bite', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 1, ws: 3, add: '2', length: 'Shortest' },
      { name: 'Sword', label: 'Sword', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 1, ws: 3, add: '2', length: 'Short' },
      { name: 'Spear', label: 'Spear', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 0, ws: 0, add: '2', length: 'Short' },
      { name: 'Mace', label: 'Mace', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 0, ws: 0, add: '2', length: 'Short' },
      { name: 'Knife', label: 'Knife', i: 2, m: 3, s: 4, shade: 'B', type: 'weapons', va: 0, ws: 0, add:'2', length:'Shortest' },
      { name:'Axe', label:'Axe', i :2 , m :3 , s :4 , shade :'B' , type :'weapons' , va :0 , ws :0 , add :'2' , length :'Short' },

      { name:'White Fire', label:'White Fire', dofI :2 , dofM :3 , dofS :4 , shade :'B' , type :'rangedWeapons' , va :0 , ws :0 , add :'1/2' , length :'Short' },

      { name: 'Bow', label: 'Bow', dofI: 2, dofM: 3, dofS: 4, shade: 'B', type: 'rangedWeapons', va: 0, ws: 0, add: '1/2', length: 'Short' },
      { name: 'Crossbow', label: 'Crossbow', dofI: 2, dofM: 3, dofS: 4, shade: 'B', type: 'rangedWeapons', va: 0, ws: 0, add: '1/2', length: 'Short' },
    ];

    data.weapons = allWeapons.map(weapon => {
      const jsonData = JSON.stringify(weapon);
      return {...weapon, json: jsonData };
    })
  }

  handleWeaponSelected(weaponName, weaponJson) {
    this.weaponName = weaponName;
    this.weaponJson = weaponJson;
    this.render();
  }

  addWoundsToRenderData(data) {
    let actor = getActor();
    if(!actor) {
      return;
    }

    let woundDice = actor.system?.pgts?.woundedDice || 0;
    let obPenality = actor.system?.pgts?.obstaclePenalties || 0;

    let woundString ="";

    if (woundDice > 0) {
      woundString = `-${woundDice}D`
    }

    if( obPenality > 0) {
      if(woundString) {
        woundString += ' / '
      }
      woundString += `-${obPenality} Ob`;
    }
    data.wounds = woundString;
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