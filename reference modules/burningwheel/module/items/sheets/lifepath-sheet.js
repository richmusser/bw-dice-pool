import { BWItemSheet } from "./bwItemSheet.js";
export class LifepathSheet extends BWItemSheet {
    getData() {
        const data = super.getData();
        return data;
    }
    get template() {
        return "systems/burningwheel/templates/items/lifepath.hbs";
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.on('drop', (e) => this._onDrop(e.originalEvent));
    }
    async _onDrop(event) {
        let data;
        try {
            data = JSON.parse(event.dataTransfer?.getData('text/plain') || "");
        }
        catch (err) {
            console.error(err);
            return;
        }
        if (data.type === "Item") {
            let item;
            if (data.uuid) {
                item = await fromUuid(data.uuid);
            }
            else if (data.pack && data.id) {
                item = await game.packs?.find(p => p.collection === data.pack).getDocument(data.id);
            }
            else if (data.actorId && data.id) {
                item = game.actors?.find((a) => a.id === data.actorId).items.get(data.id);
            }
            else {
                item = game.items?.find((i) => i.id === data.id);
            }
            if (item) {
                if (item.type === "skill") {
                    const skillList = `${this.item.system.skillList}${this.item.system.skillList ? ', ' : ''}${item.name}`;
                    this.item.update({ "data.skillList": skillList }, {});
                }
                else if (item.type === "trait") {
                    const traitList = `${this.item.system.traitList}${this.item.system.traitList ? ', ' : ''}${item.name}`;
                    this.item.update({ "data.traitList": traitList }, {});
                }
            }
        }
    }
}
