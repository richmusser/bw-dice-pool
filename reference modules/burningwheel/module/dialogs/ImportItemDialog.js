import * as helpers from "../helpers.js";
import * as constants from "../constants.js";
export class ImportItemDialog extends Dialog {
    constructor() {
        super(...arguments);
        this.searchTerm = '';
        this.sources = [];
    }
    activateListeners(html) {
        super.activateListeners(html);
        html.find('input.new-item-dialog-search').on('input', (e) => {
            this.searchTerm = $(e.target).val();
            html.find('.search-grid > .search-entry').each((_, item) => {
                if (this.sources.indexOf(item.dataset.itemSource) !== -1
                    && (item.dataset.itemName || "").toLowerCase().indexOf(this.searchTerm.toLowerCase()) !== -1) {
                    $(item).show();
                }
                else {
                    $(item).hide();
                }
            });
        });
        html.find('select[name="select-compendiums"]').select2({
            multiple: true,
            width: "97%"
        }).on('change', (e) => {
            this.sources = $(e.target).val();
            html.find('.search-grid > .search-entry').each((_, item) => {
                if (this.sources.indexOf(item.dataset.itemSource) !== -1
                    && (item.dataset.itemName || "").toLowerCase().indexOf(this.searchTerm.toLowerCase()) !== -1) {
                    $(item).show();
                }
                else {
                    $(item).hide();
                }
            });
        });
        html.find("option").each((_, o) => {
            if ((this.sources && this.sources.length === 0) || this.sources.indexOf(o.value) !== -1) {
                $(o).prop("selected", "selected");
            }
        }).parent().trigger("change");
        html.find('.search-grid > .search-entry').on('dragstart', (e) => {
            const dragData = {
                type: "Item",
                id: e.target.dataset.id,
                pack: e.target.dataset.source
            };
            if (e.originalEvent?.dataTransfer) {
                e.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dragData));
            }
        });
    }
}
export async function addNewItem(options) {
    if (!options.itemType && !options.itemTypes) {
        throw Error("Must provide one or more item types when adding new items");
    }
    if (options.itemType && !options.itemTypes) {
        options.itemTypes = [options.itemType];
    }
    const actor = options.actor;
    const loadExistingCallback = async (_html) => {
        // cache the current list of skills since it'll be used after for the actual skill data
        const items = (await helpers.getItemsOfTypes(options.itemTypes))
            .sort((a, b) => a.name < b.name ? -1 : (a.name === b.name ? 0 : 1));
        const sourceList = ["World"].concat(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array.from(game.packs?.values() || []).filter((p) => !p.private).map((p) => {
            return helpers.compendiumName(p);
        }));
        const html = await renderTemplate("systems/burningwheel/templates/dialogs/new-item-dialog.hbs", {
            searchTitle: options.searchTitle,
            items: items.map((i) => ItemToRowData(i, options)),
            sources: sourceList,
            showImages: game.settings.get(constants.systemName, constants.settings.itemImages)
        });
        const dialog = new ImportItemDialog({
            title: options.searchTitle,
            content: html,
            buttons: {
                add: {
                    label: game.i18n.localize('BW.dialog.add'),
                    callback: async (dialogHtml) => {
                        const newItems = dialogHtml.find('input:checked')
                            .map((_, element) => {
                            const itemRoot = items.find((s) => s.id === element.value);
                            Object.assign(itemRoot.system, options.forcedData);
                            return {
                                system: itemRoot.system,
                                flags: itemRoot.flags,
                                name: itemRoot.name,
                                type: itemRoot.type,
                                img: itemRoot.img
                            };
                        }).toArray();
                        actor.setFlag(constants.systemName, "compendia", dialogHtml.find("select").val());
                        actor.createEmbeddedDocuments("Item", newItems);
                    }
                },
                cancel: {
                    label: game.i18n.localize('BW.dialog.cancel')
                }
            },
            default: "add"
        }, { width: 530 });
        dialog.sources = (actor.getFlag(constants.systemName, "compendia") || []);
        dialog.render(true);
    };
    const makeNewButtons = {};
    options.itemTypes?.forEach((i) => {
        makeNewButtons[i] = {
            label: game.i18n.format("BW.dialog.makeNew", { type: i }),
            callback: async () => {
                const item = await actor.createEmbeddedDocuments("Item", [{
                        name: game.i18n.format("BW.newItem", { type: i }),
                        type: i,
                        data: options.baseData,
                        img: options.img
                    }]);
                return actor.items.get(item[0].id)?.sheet?.render(true);
            }
        };
    });
    makeNewButtons.loadExisting = {
        label: game.i18n.format("BW.dialog.importExisting", { type: options.itemType || "item" }),
        callback: (html) => loadExistingCallback(html)
    };
    const defaultButton = (options.itemTypes && options.itemTypes[0]) || "";
    return new Dialog({
        title: options.searchTitle,
        content: options.popupMessage || "",
        buttons: makeNewButtons,
        default: defaultButton
    }, {
        classes: ["dialog", "import-dialog"]
    }).render(true);
}
function ItemToRowData(item, options) {
    return {
        name: item.name,
        itemDataLeft: options.itemDataLeft(item),
        itemDataMid: options.itemDataMid(item),
        itemSource: item.itemSource || game.i18n.localize("BW.dialog.world"),
        id: item.id,
        img: item.img,
        source: item.compendium ? item.compendium.collection : undefined
    };
}
