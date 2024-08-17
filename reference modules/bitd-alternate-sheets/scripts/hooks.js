import { BladesAlternateActorSheet } from "./blades-alternate-actor-sheet.js";
import { Patch } from "./patches.js";
import { MODULE_ID, Utils } from "./utils.js";

export async function registerHooks() {
  // Hooks.once('ready', () => {
    // if(!game.modules.get('lib-wrapper')?.active && game.user.isGM)
    //   ui.notifications.error("Module Blades in the Dark Alternate Sheets requires the 'libWrapper' module. Please install and activate it.");
    // CONFIG.debug.hooks = true;
  // });

  Hooks.once('ready', () => {

    CONFIG.TextEditor.enrichers = CONFIG.TextEditor.enrichers.concat([
      {
          pattern : /(@UUID\[([^]*?)]){[^}]*?}/gm,
          enricher : async (match, options) => {
            let linkedDoc = await fromUuid(match[2]);
            if(linkedDoc?.type == "🕛 clock"){
              const doc = document.createElement("div");
              doc.classList.add('linkedClock');
              let droppedItemTextRaw = match[0];
              let droppedItemRegex = /{[^}]*?}/g;
              let droppedItemTextRenamed = droppedItemTextRaw.replace(droppedItemRegex, `{${linkedDoc.name}}`);
              doc.innerHTML = `<img src="systems/blades-in-the-dark/styles/assets/progressclocks-svg/Progress Clock ${linkedDoc.system.type}-${linkedDoc.system.value}.svg" class="clockImage" data-uuid="${match[2]}" />
                <br/> 
                ${droppedItemTextRenamed}`;
                // ${match[0]}`;
              // doc.innerHTML = `<img src="${linkedDoc.img}" class="clockImage" data-uuid="${match[2]}" />
              //   <br/> 
              //   ${match[0]}`;
              return doc;
            }
            else return false;
          }
      }
    ])
  });
  //why isn't sheet showing up in update hook?

  Hooks.on("deleteItem", async (item, options, id) =>{
    if(item.type === "item" && item.parent){
      await Utils.toggleOwnership(false, item.parent, "item", item.id)
    }
  })

  Hooks.on("renderBladesClockSheet", async(sheet, html, options)=>{
    let characters = game.actors.filter(a => {
      return a.type === "character";
    });
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index];
      let notes = await character.getFlag('bitd-alternate-sheets', 'notes');
      notes = notes ? notes : "";
      if(notes.includes(sheet.actor._id)){
        character.sheet.render(false);
      }
      
    }
  });
  // should we just display items and abilities some other way so switching back and forth between sheets is easy?
  Hooks.on("updateActor", async (actor, updateData, options, actorId)=>{
    if(options.diff && updateData?.flags?.core && "sheetClass" in updateData?.flags?.core){
    }
    if(actor._sheet instanceof BladesAlternateActorSheet){
    }
  });

  Hooks.on("createActor", async (actor)=>{
    if(actor._sheet instanceof BladesAlternateActorSheet){
    }
  })
  return true;
}