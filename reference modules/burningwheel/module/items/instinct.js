import { simpleBroadcast } from "../chat.js";
import { BWItem } from "./item.js";
export class Instinct extends BWItem {
    async generateChatMessage(actor) {
        const data = {
            title: this.name,
            mainText: this.system.text,
            extraData: [
                {
                    title: `Spent Artha`,
                    text: `Fate: ${this.system.fateSpent || 0}; Persona: ${this.system.personaSpent || 0}; Deeds: ${this.system.deedsSpent || 0}`
                }
            ]
        };
        return simpleBroadcast(data, actor);
    }
}
