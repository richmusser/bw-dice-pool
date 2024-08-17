import * as constants from "../../constants.js";
import * as helpers from "../../helpers.js";
export class BWActorSheet extends ActorSheet {
    constructor() {
        super(...arguments);
        this._keyDownHandler = this._handleKeyPress.bind(this);
        this._keyUpHandler = this._handleKeyUp.bind(this);
    }
    get template() {
        const path = "systems/burningwheel/templates";
        return `${path}/${this.actor.type}-sheet.hbs`;
    }
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["bw-app"]
        });
    }
    getData(_options) {
        super.getData();
        return {
            actor: this.actor,
            system: this.actor.system,
            isObserver: this.actor.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER,
            isOwner: this.actor.permission >= CONST.DOCUMENT_PERMISSION_LEVELS.OWNER,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        };
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find("input[data-item-id], select[data-item-id], textarea[data-item-id]")
            .on("change", (e) => this._updateItemField(e));
        $(document).off("keydown", this._keyDownHandler).on("keydown", this._keyDownHandler);
        $(document).off("keyup", this._keyUpHandler).on("keyup", this._keyUpHandler);
        if (this.options.draggableItemSelectors) {
            html.find(this.options.draggableItemSelectors.join('[draggable="true"], ')).on('dragstart', (e) => {
                const actor = this.actor;
                const item = actor.items.get(e.target.dataset.id || "");
                const dragData = {
                    actorId: actor.id,
                    id: item.id,
                    uuid: item.uuid,
                    type: "Item",
                    data: item,
                    pack: actor.compendium ? actor.compendium.collection : undefined
                };
                if (e.originalEvent?.dataTransfer) {
                    e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                }
            });
        }
        if (this.options.draggableMeleeSelectors) {
            html.find(this.options.draggableMeleeSelectors.join('[draggable="true"], ')).on('dragstart', (e) => {
                const actor = this.actor;
                const itemId = e.target.dataset.weaponId || "";
                const weapon = actor.items.get(itemId);
                const dragData = {
                    actorId: actor.id,
                    id: itemId,
                    uuid: weapon.uuid,
                    type: "Melee",
                    data: {
                        index: parseInt(e.target.dataset.attackIndex || "0"),
                        name: weapon.name,
                        img: weapon.img
                    }
                };
                if (e.originalEvent?.dataTransfer) {
                    e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                }
            });
        }
        if (this.options.draggableRangedSelectors) {
            html.find(this.options.draggableRangedSelectors.join('[draggable="true"], ')).on('dragstart', (e) => {
                const actor = this.actor;
                const itemId = e.target.dataset.weaponId || "";
                const weapon = actor.items.get(itemId);
                const dragData = {
                    actorId: actor.id,
                    id: itemId,
                    uuid: weapon.uuid,
                    type: "Ranged",
                    data: {
                        name: weapon.name,
                        img: weapon.img
                    }
                };
                if (e.originalEvent?.dataTransfer) {
                    e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                }
            });
        }
        if (this.options.draggableStatSelectors) {
            html.find(this.options.draggableStatSelectors.join('[draggable="true"], ')).on('dragstart', (e) => {
                const actor = this.actor;
                const statPath = e.target.dataset.accessor || "";
                const statName = e.target.dataset.statName || "";
                const dragData = {
                    actorId: actor.id,
                    type: "Stat",
                    data: {
                        name: statName,
                        path: statPath
                    }
                };
                if (e.originalEvent?.dataTransfer) {
                    e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
                }
            });
        }
    }
    async close() {
        $(document).off("keydown", this._keyDownHandler);
        $(document).off("keyup", this._keyUpHandler);
        return super.close();
    }
    _handleKeyPress(e) {
        if (e.ctrlKey || e.metaKey) {
            $("form.character, form.npc").addClass("ctrl-modified");
        }
        else if (e.altKey) {
            $("form.character").addClass("alt-modified");
        }
        else if (e.shiftKey) {
            $("form.character, form.npc").addClass("shift-modified");
        }
    }
    _handleKeyUp(e) {
        if (e.key === "Control" || e.key === "Meta") {
            $("form.character, form.npc").removeClass("ctrl-modified");
        }
        else if (e.key === "Alt") {
            $("form.character").removeClass("alt-modified");
        }
        else if (e.key === "Shift") {
            $("form.character, form.npc").removeClass("shift-modified");
        }
    }
    _updateItemField(e) {
        e.preventDefault();
        const t = e.currentTarget;
        let value;
        switch ($(t).prop("type")) {
            case "checkbox":
                value = $(t).prop("checked");
                break;
            case "number":
            case "radio":
                value = parseInt($(t).val());
                break;
            default:
                value = $(t).val();
        }
        const id = $(t).data("item-id");
        const binding = $(t).data("binding");
        const item = this.actor.items.get(id);
        const updateParams = {};
        updateParams[binding] = value;
        if (item) {
            item.update(updateParams, {});
        }
    }
    getArmorDictionary(armorItems) {
        let armorLocs = {};
        constants.armorLocations.forEach(al => armorLocs[al] = null); // initialize locations
        armorItems.forEach(i => armorLocs = { ...armorLocs, ...helpers.getArmorLocationDataFromItem(i) });
        return armorLocs;
    }
}
