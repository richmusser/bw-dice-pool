import { warn, error, i18n, debug } from "./lib/lib.js";
import { ChatLink } from "./Chatlink.js";
import { SettingsForm } from "./settings-form.js";
import { ImageReplacerData } from "./ChatPortraitModels.js";
import CONSTANTS from "./constants.js";
import API from "./api.js";
/**
 * Main class wrapper for all of our features.
 */
export class ChatPortrait {
    /**
     * @param  {ChatMessage} chatMessage
     * @param  {JQuery} html
     * @param  {MessageRenderData} messageData
     */
    static onRenderChatMessage(chatMessage, html, speakerInfo, imageReplacer) {
        let doNotStyling = false;
        let doNotPrintPortrait = false;
        let doOnlyPortrait = false;
        const gameSystemId = API.retrieveSystemId();
        // PATCH Compatibility with DF Chat Enhancements module
        // multiple portrait when chat merged by DF Chat Enhancements
        const elementMessageHeaderBySystem1 = html.find(`chat-portrait-message-header-${gameSystemId}`);
        // TODO TO REMOVE
        const elementMessageHeaderBySystem2 = html.find(`chat-portrait-message-portrait-${gameSystemId}`);
        // TODO TO REMOVE
        const elementMessageHeaderBySystem3 = html.find(`chat-portrait-message-portrait`);
        if (elementMessageHeaderBySystem1?.length > 0 ||
            elementMessageHeaderBySystem2?.length > 0 ||
            elementMessageHeaderBySystem3?.length > 0) {
            return undefined;
        }
        // PreHook (can abort the interaction with the door)
        if (Hooks.call("ChatPortraitEnabled") === false) {
            return html;
        }
        if (!ChatPortrait.shouldOverrideMessageStyling(speakerInfo)) {
            // Do not style this
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingWhisperToOther && ChatPortrait.isWhisperToOther(speakerInfo)) {
            // Don't update whispers that the current player isn't privy to
            doNotStyling = true;
        }
        const messageType = ChatPortrait.getMessageTypeVisible(speakerInfo);
        if (!ChatPortrait.settings.displaySettingOTHER && messageType == CONST.CHAT_MESSAGE_TYPES.OTHER) {
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingOOC && messageType == CONST.CHAT_MESSAGE_TYPES.OOC) {
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingIC && messageType == CONST.CHAT_MESSAGE_TYPES.IC) {
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingEMOTE && messageType == CONST.CHAT_MESSAGE_TYPES.EMOTE) {
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingWHISPER && messageType == CONST.CHAT_MESSAGE_TYPES.WHISPER) {
            doNotStyling = true;
        }
        if (!ChatPortrait.settings.displaySettingROLL && messageType == CONST.CHAT_MESSAGE_TYPES.ROLL) {
            doNotStyling = true;
        }
        if (ChatPortrait.settings.disablePortraitForAliasGmMessage) {
            const userByAlias = game.users?.find((u) => {
                return (speakerInfo.alias === u.name || speakerInfo.author.name === u.name) && u?.isGM;
            });
            if (userByAlias) {
                doNotStyling = true;
            }
        }
        // PATCH MODULE NARRATOR TOOLS
        // Do not styling narrator message because it's make no sense the module has is own css customizing
        if (speakerInfo.alias == i18n("NT.Narrator")) {
            //  && game.modules.get('narrator-tools')?.active
            return html;
        }
        // PATCH MODULE koboldworks-turn-announcer
        const isTurnAnnouncer = html.find(".message-content .turn-announcer .portrait")[0];
        if (isTurnAnnouncer) {
            //  && game.modules.get('koboldworks-turn-announcer')?.active
            const size = ChatPortrait.settings.portraitSize;
            if (size && size > 0) {
                isTurnAnnouncer.style.width = size + "px";
                isTurnAnnouncer.style.height = size + "px";
                isTurnAnnouncer.style.flex = "0 0 " + size + "px";
            }
            doNotStyling = true;
        }
        // PATCH MODULE TOKEN BAR  - IS MONK TOKEN BAR XP
        const isMonkTokenBarXP = html.find(".message-content")[0]?.firstElementChild?.classList;
        if (isMonkTokenBarXP && isMonkTokenBarXP.length > 0) {
            if (isMonkTokenBarXP.contains("monks-tokenbar") && "assignxp") {
                doNotStyling = true;
            }
        }
        // PATCH IRON MONK LITTLE UTILITIES ROUND UP MESSAGE
        const isMonkLittleUtilitiesRoundUp = getProperty(chatMessage, `flags.monks-little-details.roundmarker`);
        if (String(isMonkLittleUtilitiesRoundUp) === "true") {
            doNotStyling = true;
        }
        // PATCH IRON MONK SHOP ACTION
        const isMonkEnhancedJournal = getProperty(chatMessage, `flags.monks-enhanced-journal.action`);
        if (isMonkEnhancedJournal) {
            doOnlyPortrait = true;
        }
        // PATCH MODULE CHAT IMAGE
        const isChatImage = html.find(".message-content .chat-images-container img")[0];
        if (isChatImage) {
            isChatImage.style.width = "100%";
            isChatImage.style.height = "100%";
            doNotStyling = true;
        }
        // PATCH INNOCENTI LOOT
        const isInnocentiLoot = html.find(".message-content .innocenti-loot")[0];
        if (isInnocentiLoot) {
            doNotStyling = true;
        }
        // PATCH MONK UTILTIIES ROUND UP (https://github.com/ShoyuVanilla/FoundryVTT-Chat-Portrait/issues/121)
        const isMonkRoundup = html.find(".message-content .round-marker")[0];
        if (isMonkRoundup) {
            doNotStyling = true;
        }
        // PATCH DragonFlagon Chat Enhancements
        let hasTop = false;
        let hasBottom = false;
        let hasMiddle = false;
        if (html[0]?.classList.contains(`dfce-cm-top`)) {
            hasTop = true;
        }
        if (html[0]?.classList.contains(`dfce-cm-middle`)) {
            hasMiddle = true;
        }
        if (html[0]?.classList.contains(`dfce-cm-bottom`)) {
            hasBottom = true;
        }
        if (hasBottom || hasMiddle) {
            doNotPrintPortrait = true;
        }
        // MULTISYSTEM MANAGEMENT
        let messageSenderElement;
        let messageHeaderElementBase;
        let elementItemImageList;
        let elementItemNameList;
        let elementItemContentList;
        let elementItemTextList;
        messageSenderElement = html.find(".message-sender")[0];
        if (!messageSenderElement) {
            messageSenderElement = html.find(".chat-card")[0];
        }
        messageHeaderElementBase = html.find(".message-header")[0];
        if (!messageHeaderElementBase) {
            messageHeaderElementBase = html.find(".card-header")[0];
        }
        elementItemImageList = html.find(".message-content img");
        if (!elementItemImageList) {
            elementItemImageList = html.find(".card-content img");
        }
        elementItemNameList = html.find(".message-content h3");
        if (!elementItemNameList) {
            elementItemNameList = html.find(".card-content h3");
        }
        elementItemContentList = html.find(".message-content");
        if (!elementItemContentList) {
            elementItemContentList = html.find(".card-content");
        }
        elementItemTextList = html.find(".message-header .flavor-text");
        if (!elementItemTextList) {
            elementItemTextList = html.find(".card-header p");
        }
        if (!elementItemContentList[0]?.innerText) {
            return html;
        }
        if (!elementItemContentList[0]?.innerText.replace(/(\r\n|\r|\n)/g, "").trim()) {
            return html;
        }
        if (doNotStyling) {
            /*
            const headerImageElement2 = document.createElement("header");
            headerImageElement2.classList.add("message-header");
            headerImageElement2.classList.add("chat-portrait-flexrow");
            if (!headerImageElement2.classList.contains(`chat-portrait-message-content-${gameSystemId}`)) {
                headerImageElement2.classList.add(`chat-portrait-message-content-${gameSystemId}`);
            }
            const messageHeaderElement2 = <HTMLElement>(
                messageHeaderElementBase.parentElement?.insertBefore(
                    headerImageElement2,
                    messageHeaderElementBase.parentElement?.firstChild
                )
            );
            const headerTextElement2 = document.createElement("h4");
            headerTextElement2.classList.add("message-sender");
            headerTextElement2.classList.add(`chat-portrait-text-content-name-${gameSystemId}`);
            messageHeaderElement2.appendChild(headerTextElement2);

            const headerImageElement = document.createElement("header");
            headerImageElement.classList.add("message-header");
            headerImageElement.classList.add("chat-portrait-flexrow");
            if (!headerImageElement.classList.contains(`chat-portrait-message-header-${gameSystemId}`)) {
                headerImageElement.classList.add(`chat-portrait-message-header-${gameSystemId}`);
            }
            const messageHeaderElement = <HTMLElement>(
                messageHeaderElementBase.parentElement?.insertBefore(
                    headerImageElement,
                    messageHeaderElementBase.parentElement?.firstChild
                )
            );
            // Text is transfer to header
            const headerTextElement = document.createElement("h4");
            if (messageSenderElement.textContent) {
                headerTextElement.innerHTML = <string>messageSenderElement.innerHTML;
            } else {
                const useTokenName: boolean = ChatPortrait.settings.useTokenName;
                const speaker = speakerInfo.message.speaker;
                const actorName = (ChatPortrait.getActorName(speaker) || "").trim();
                const tokenName = (ChatPortrait.getTokenName(speaker) || "").trim();
                if (useTokenName) {
                    headerTextElement.innerHTML = tokenName;
                } else {
                    headerTextElement.innerHTML = actorName;
                }
            }
            headerTextElement.classList.add("message-sender");
            headerTextElement.classList.add(`chat-portrait-text-header-name-${gameSystemId}`);
            messageHeaderElement.appendChild(headerTextElement);
            messageSenderElement.textContent = "";
            */
            let authorColor = "black";
            if (speakerInfo.author) {
                authorColor = speakerInfo.author.color;
            }
            else {
                //@ts-ignore
                authorColor = speakerInfo?.user.color;
            }
            const messageData = speakerInfo.message;
            ChatPortrait.setCustomStylingText(html, messageData, authorColor, gameSystemId);
            ChatPortrait.setChatMessageBackground(html, messageData, authorColor);
            ChatPortrait.setChatMessageBorder(html, messageData, authorColor);
            if (ChatPortrait.settings.displayPlayerName) {
                ChatPortrait.appendPlayerName(messageHeaderElementBase, messageSenderElement, speakerInfo.author, gameSystemId);
            }
            if (ChatPortrait.settings.displayMessageTag) {
                ChatPortrait.injectMessageTag(html, speakerInfo, messageHeaderElementBase, gameSystemId);
                ChatPortrait.injectWhisperParticipants(html, speakerInfo, gameSystemId);
            }
            ChatLink.prepareEvent(chatMessage, html, speakerInfo, gameSystemId);
            return html;
        }
        else {
            //@ts-ignore
            const myPromise = ChatPortrait.onRenderChatMessageInternal(chatMessage, html, speakerInfo, messageSenderElement, messageHeaderElementBase, elementItemImageList, elementItemNameList, elementItemContentList, elementItemTextList, imageReplacer, gameSystemId, doNotPrintPortrait, doOnlyPortrait);
            if (myPromise) {
                myPromise.then((html) => {
                    return html;
                });
            }
            else {
                return html;
            }
            return undefined;
        }
    }
    /**
     * @param  {ChatMessage} chatMessage
     * @param  {JQuery} html
     * @param  {MessageRenderData} messageData
     */
    static onRenderChatMessageInternal(chatMessage, html, speakerInfo, messageSender, messageHeaderBase, elementItemImageList, elementItemNameList, elementItemContentList, elementItemTextList, imageReplacer, gameSystemId, doNotPrintPortrait, doOnlyPortrait) {
        const messageDataBase = speakerInfo;
        let imgPath;
        let authorColor = "black";
        if (messageDataBase.author) {
            authorColor = messageDataBase.author.color;
        }
        else {
            //@ts-ignore
            authorColor = messageDataBase?.user.color;
        }
        let speaker;
        if (speakerInfo.message?.user) {
            speaker = speakerInfo;
        }
        if (!speaker && speakerInfo.message) {
            speaker = speakerInfo.message.speaker;
        }
        if (!speaker) {
            speaker = speakerInfo;
        }
        if (speaker && !speaker.alias && speaker.document?.alias) {
            speaker.alias = speaker.document?.alias;
        }
        const message = speaker ? (speaker.message ? speaker.message : speaker.document) : null;
        if (!message) {
            warn('No message thi is usually a error from other modules like midi-qol, dnd5e helper, ecc you can try to use the "preCreateChatMessage" hook by enable the module setting');
            return null;
        }
        const useTokenName = ChatPortrait.settings.useTokenName;
        if (useTokenName) {
            ChatPortrait.replaceSenderWithTokenName(messageSender, speaker);
        }
        if (ChatPortrait.shouldOverrideMessageUnknown(messageDataBase)) {
            imgPath = CONSTANTS.DEF_TOKEN_IMG_PATH;
        }
        else {
            imgPath = ChatPortrait.loadImagePathForChatMessage(speaker);
        }
        const chatPortraitCustomData = {
            customIconPortraitImage: imgPath,
            customImageReplacer: {},
            customImageReplacerData: API.imageReplacerIconizer
        };
        Hooks.call("ChatPortraitReplaceData", chatPortraitCustomData, chatMessage);
        if (chatPortraitCustomData.customIconPortraitImage) {
            imgPath = chatPortraitCustomData.customIconPortraitImage;
        }
        // ty to Mejari for the contribute
        let imageReplacerToUse = [];
        if (!!chatPortraitCustomData.customImageReplacerData &&
            typeof chatPortraitCustomData.customImageReplacerData == "object") {
            imageReplacerToUse = chatPortraitCustomData.customImageReplacerData;
        }
        else if (chatPortraitCustomData.customImageReplacer &&
            !!chatPortraitCustomData.customImageReplacer &&
            typeof chatPortraitCustomData.customImageReplacer == "object") {
            const imageReplacerToUseOLD = chatPortraitCustomData.customImageReplacer;
            for (const key in imageReplacerToUseOLD) {
                imageReplacerToUse.push({
                    name: key,
                    icon: imageReplacerToUseOLD[key]
                });
            }
        }
        return ChatPortrait.generatePortraitImageElement(imgPath, gameSystemId).then((imgElement) => {
            // Very very rare use case ????
            if (!imgElement) {
                imgElement = document.createElement("img");
                imgElement.src = "";
                const size = ChatPortrait.settings.portraitSize;
                if (size && size > 0) {
                    imgElement.width = size;
                    imgElement.height = size;
                }
                // WE TRY TO GET THE AVATAR IMAGE ANYWAY
                if (ChatPortrait.settings.useAvatarImage) {
                    imgElement.src = ChatPortrait.getUserAvatarImageFromChatMessage(speaker);
                }
                if (!imgElement.src || imgElement.src.length <= 0) {
                    imgElement.src = CONSTANTS.INV_UNIDENTIFIED_BOOK;
                }
                if (!imgElement.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                    imgElement.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                }
            }
            // const headerTextElement = <HTMLElement>document.querySelector(".message-header");
            // headerTextElement.prepend(imgElement);
            const headerTextElement = messageHeaderBase; //<HTMLElement>html.find('.message-header')[0];
            headerTextElement.prepend(imgElement);
            if (!headerTextElement.classList.contains(`chat-portrait-message-header-${gameSystemId}`)) {
                headerTextElement.classList.add(`chat-portrait-message-header-${gameSystemId}`);
            }
            const headerTextElement3 = document.createElement("h4");
            if (!headerTextElement3.classList.contains(`chat-portrait-text-content-name-${gameSystemId}`)) {
                headerTextElement3.classList.add(`chat-portrait-text-content-name-${gameSystemId}`);
            }
            if (!headerTextElement3.classList.contains(`chat-portrait-flexrow`)) {
                headerTextElement3.classList.add(`chat-portrait-flexrow`);
            }
            const messageContent = html.find(".message-content")[0];
            messageContent?.insertBefore(headerTextElement3, messageContent.firstChild);
            /*
            // I need this orribile piece of code for better manage the multisystem use case
            const headerImageElement3 = document.createElement("header");
            // headerImageElement3.classList.add("message-header");
            headerImageElement3.classList.add("chat-portrait-flexrow");
            if (!headerImageElement3.classList.contains(`chat-portrait-message-content-${gameSystemId}`)) {
                headerImageElement3.classList.add(`chat-portrait-message-content-${gameSystemId}`);
            }
            const messageHeaderElement3 = <HTMLElement>(
                messageHeaderBase.parentElement?.insertBefore(
                    headerImageElement3,
                    messageHeaderBase.parentElement?.firstChild
                )
            );
            const headerTextElement3 = document.createElement("h4");
            headerTextElement3.classList.add("message-sender");
            headerTextElement3.classList.add(`chat-portrait-text-content-name-${gameSystemId}`);
            messageHeaderElement3.appendChild(headerTextElement3);

            const headerImageElement = document.createElement("header");
            // headerImageElement.classList.add("message-header");
            headerImageElement.classList.add("chat-portrait-flexrow");
            if (!headerImageElement.classList.contains(`chat-portrait-message-header-${gameSystemId}`)) {
                headerImageElement.classList.add(`chat-portrait-message-header-${gameSystemId}`);
            }
            headerImageElement.appendChild(imgElement);

            const messageHeader = <HTMLElement>(
                messageHeaderBase.parentElement?.insertBefore(
                    headerImageElement,
                    messageHeaderBase.parentElement?.firstChild
                )
            );
            // Text is transfer to header
            const headerTextElement = document.createElement("h4");
            if (messageSender.textContent) {
                headerTextElement.innerHTML = <string>messageSender.innerHTML;
            } else {
                const useTokenName: boolean = ChatPortrait.settings.useTokenName;
                const speaker = speakerInfo.message.speaker;
                const actorName = (ChatPortrait.getActorName(speaker) || "").trim();
                const tokenName = (ChatPortrait.getTokenName(speaker) || "").trim();
                if (useTokenName) {
                    headerTextElement.innerHTML = tokenName;
                } else {
                    headerTextElement.innerHTML = actorName;
                }
            }
            headerTextElement.classList.add("message-sender");
            headerTextElement.classList.add(`chat-portrait-text-header-name-${gameSystemId}`);
            messageHeader.appendChild(headerTextElement);

            const messageMetadata: HTMLElement = <HTMLElement>html.find(".message-metadata")[0];
            messageHeader.appendChild(messageMetadata);
            // hide old header
            if (<HTMLElement>messageSender.parentElement) {
                (<HTMLElement>messageSender.parentElement).style.display = "none";
            }
            */
            if (doOnlyPortrait) {
                return html;
            }
            const messageData = messageDataBase.message;
            // GOD HELP ME: Use case where we not must prepend the image or imagReplacer
            // PATCH
            const isRollTable = messageData.flags?.core?.RollTable ? true : false;
            let messageHtmlContent = undefined;
            try {
                messageHtmlContent = $(messageData.content);
            }
            catch (e) {
                messageHtmlContent = undefined;
            }
            // PATCH CUB - Enhanced Cconditions
            const isEnhancedConditionsCUB = messageHtmlContent
                ? messageHtmlContent.hasClass("enhanced-conditions")
                : false;
            // PATCH MIDIQOL - SAVE DISPLAY
            const isMidiDisplaySave = messageHtmlContent
                ? $(messageData.content).find(".midi-qol-saves-display")?.length > 0
                : false;
            // PATCH STARWARSFFG SYSTEM - DICE ROLL
            const isStarwarsffgDiceRoll = messageHtmlContent
                ? messageHtmlContent.hasClass("starwarsffg dice-roll")
                : false;
            const doNotPrependImage = isRollTable || isEnhancedConditionsCUB || isMidiDisplaySave || isStarwarsffgDiceRoll;
            const doNotImageReplacer = isMidiDisplaySave;
            if (doNotPrintPortrait) {
                imgElement.style.display = "none";
            }
            ChatPortrait.setImageBorder(imgElement, authorColor);
            // Place the image to left of the header by injecting the HTML
            // const messageHeader: HTMLElement = <HTMLElement>html.find('.message-header')[0];
            // TODO OLD SETTING ??
            // messageHeader.prepend(imgElement);
            /*
            if (ChatPortrait.settings.flavorNextToPortrait) {
                const flavorElement: JQuery = html.find(".flavor-text");
                if (flavorElement && flavorElement.length > 0) {
                    const copiedElement: Node = <Node>flavorElement[0]?.cloneNode(true);
                    flavorElement.remove();
                    const brElement: HTMLElement = document.createElement("br");

                    messageSender.appendChild(brElement);
                    messageSender.appendChild(copiedElement);
                }
            }
            */
            // Default style
            if (!messageSender.classList.contains(`chat-portrait-text-size-name-${gameSystemId}`)) {
                messageSender.classList.add(`chat-portrait-text-size-name-${gameSystemId}`);
                messageSender.style.alignSelf = "center";
            }
            // Update size text name by settings
            if (ChatPortrait.settings.textSizeName > 0) {
                const size = ChatPortrait.settings.textSizeName;
                messageSender.style.fontSize = size + "px";
                if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                    messageSender.innerText = ChatPortrait.settings.displayUnknownPlaceHolderActorName; //'Unknown Actor';
                }
            }
            else if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                messageSender.innerText = ChatPortrait.settings.displayUnknownPlaceHolderActorName; //'Unknown Actor';
            }
            // TODO can't remember why i'm doing this
            // if (!headerTextElement.classList.contains(`chat-portrait-text-size-name-${gameSystemId}`)) {
            // 	headerTextElement.classList.add(`chat-portrait-text-size-name-${gameSystemId}`);
            // 	headerTextElement.style.alignSelf = "center";
            // }
            // Update size text name by settings
            if (ChatPortrait.settings.textSizeName > 0) {
                const size = ChatPortrait.settings.textSizeName;
                headerTextElement.style.fontSize = size + "px";
                if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                    headerTextElement.innerText = ChatPortrait.settings.displayUnknownPlaceHolderActorName; //'Unknown Actor';
                }
            }
            else if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                headerTextElement.innerText = ChatPortrait.settings.displayUnknownPlaceHolderActorName; //'Unknown Actor';
            }
            // Add click listener to image and text
            ChatLink.prepareEventImage(chatMessage, html, speaker, gameSystemId);
            // Update size item image by settings
            if (elementItemImageList.length > 0 &&
                ChatPortrait.settings.portraitSizeItem != 36 &&
                ChatPortrait.settings.portraitSizeItem > 0) {
                for (let i = 0; i < elementItemImageList.length; i++) {
                    const elementItemImage = elementItemImageList[i];
                    if (!elementItemImage) {
                        continue;
                    }
                    const size = ChatPortrait.settings.portraitSizeItem;
                    if (size && size > 0) {
                        elementItemImage.width = size;
                        elementItemImage.height = size;
                    }
                    if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                        elementItemImage.src = ChatPortrait.settings.displayUnknownPlaceHolderItemIcon; //`modules/${MODULE_NAME}/assets/inv-unidentified.png`;
                    }
                    if (!elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                        elementItemImage.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                    }
                }
            }
            else if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                for (let i = 0; i < elementItemImageList.length; i++) {
                    const elementItemImage = elementItemImageList[i];
                    if (!elementItemImage) {
                        continue;
                    }
                    elementItemImage.src = ChatPortrait.settings.displayUnknownPlaceHolderItemIcon; //`modules/${MODULE_NAME}/assets/inv-unidentified.png`;
                    const size = ChatPortrait.settings.portraitSizeItem;
                    if (size && size > 0) {
                        elementItemImage.width = size;
                        elementItemImage.height = size;
                    }
                    if (!elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                        elementItemImage.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                    }
                }
            }
            // Update hide info about the weapon
            if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                for (let i = 0; i < elementItemNameList.length; i++) {
                    const elementItemName = elementItemNameList[i];
                    elementItemName.innerText = ChatPortrait.settings.displayUnknownPlaceHolderItemName; //'Unknown Weapon';
                }
                for (let i = 0; i < elementItemContentList.length; i++) {
                    const elementItemContent = elementItemContentList[i];
                    elementItemContent.innerText = ChatPortrait.settings.displayUnknownPlaceHolderItemName; //'Unknown Weapon';
                }
            }
            // Check for Ability/Skills/Tools/Saving Throw for avoid the double portrait
            if (elementItemNameList.length > 0) {
                for (let i = 0; i < elementItemNameList.length; i++) {
                    const elementItemName = elementItemNameList[i];
                    if (elementItemName) {
                        if (!elementItemName.classList.contains(`chat-portrait-text-size-name-${gameSystemId}`)) {
                            elementItemName.classList.add(`chat-portrait-text-size-name-${gameSystemId}`);
                        }
                        let value = "";
                        let images = { iconMainReplacer: "", iconsDamageType: [] };
                        if (ChatPortrait.useImageReplacer(html)) {
                            images = ChatPortrait.getImagesReplacerAsset(imageReplacerToUse, elementItemName.innerText, elementItemContentList[i]);
                            if (images && images.iconMainReplacer) {
                                value = images.iconMainReplacer;
                            }
                        }
                        if (value) {
                            if (elementItemImageList.length > 0) {
                                const elementItemImage = elementItemImageList[i];
                                if (!elementItemImage) {
                                    continue;
                                }
                                const size = ChatPortrait.settings.portraitSizeItem;
                                if (size && size > 0) {
                                    elementItemImage.width = size;
                                    elementItemImage.height = size;
                                }
                                // Just ignore if a image is provided
                                //if(!elementItemImage.src || elementItemImage.src?.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME)){
                                if (value.length > 0 && !doNotImageReplacer) {
                                    elementItemImage.src = value;
                                }
                                //}
                                if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                    elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                                }
                                if (!doNotImageReplacer &&
                                    !doNotPrependImage &&
                                    !elementItemImage.src.endsWith("/game")) {
                                    if (
                                    // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                    !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                        // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                        !(game.system.id === "pf2e" &&
                                            messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                        elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                        elementItemName.prepend(elementItemImage);
                                    }
                                }
                                // DAMAGE TYPES
                                if (images &&
                                    images.iconsDamageType.length > 0 &&
                                    ChatPortrait.settings.useImageReplacerDamageType) {
                                    const elementItemContainerDamageTypes = (document.createElement("div"));
                                    for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                        const elementItemImage2 = (document.createElement("img"));
                                        const size = ChatPortrait.settings.portraitSizeItem;
                                        if (size && size > 0) {
                                            elementItemImage2.width = size;
                                            elementItemImage2.height = size;
                                        }
                                        // Just ignore if a image is provided
                                        if (itemImage.length > 0) {
                                            elementItemImage2.src = itemImage; //images[1];
                                        }
                                        if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                            elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                        }
                                        elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                    }
                                    // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                    // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                    // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                    elementItemName.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemName.nextSibling);
                                }
                            }
                            else {
                                if (ChatPortrait.useImageReplacer(html)) {
                                    const elementItemImage = (document.createElement("img"));
                                    const size = ChatPortrait.settings.portraitSizeItem;
                                    if (size && size > 0) {
                                        elementItemImage.width = size;
                                        elementItemImage.height = size;
                                    }
                                    // Just ignore if a image is provided
                                    //if(!elementItemImage.src || elementItemImage.src?.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME)){
                                    if (value.length > 0 && !doNotImageReplacer) {
                                        elementItemImage.src = value;
                                    }
                                    //}
                                    if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                        elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                                    }
                                    if (!doNotImageReplacer &&
                                        !doNotPrependImage &&
                                        !elementItemImage.src.endsWith("/game")) {
                                        if (
                                        // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                        !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                            // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                            !(game.system.id === "pf2e" &&
                                                messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                            elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                            elementItemName.prepend(elementItemImage);
                                        }
                                    }
                                    // DAMAGE TYPES
                                    if (images &&
                                        images.iconsDamageType.length > 0 &&
                                        ChatPortrait.settings.useImageReplacerDamageType) {
                                        const elementItemContainerDamageTypes = (document.createElement("div"));
                                        for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                            const elementItemImage2 = (document.createElement("img"));
                                            const size = ChatPortrait.settings.portraitSizeItem;
                                            if (size && size > 0) {
                                                elementItemImage2.width = size;
                                                elementItemImage2.height = size;
                                            }
                                            // Just ignore if a image is provided
                                            if (itemImage.length > 0) {
                                                elementItemImage2.src = itemImage; //images[1];
                                            }
                                            if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                                elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                            }
                                            elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                        }
                                        // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                        // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                        // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                        elementItemName.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemName.nextSibling);
                                    }
                                }
                            }
                        }
                        else {
                            if (elementItemImageList.length > 0) {
                                const elementItemImage = elementItemImageList[i];
                                if (!elementItemImage) {
                                    continue;
                                }
                                const size = ChatPortrait.settings.portraitSizeItem;
                                if (size && size > 0) {
                                    elementItemImage.width = size;
                                    elementItemImage.height = size;
                                }
                                if (!elementItemImage.src ||
                                    elementItemImage.src?.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                                    // TODO DA RIVEDERE
                                    elementItemImage.src = ""; // ChatPortrait.settings.displayUnknownPlaceHolderItemIcon;
                                    if (messageHtmlContent) {
                                        // PATCH MODULE MERCHANT SHEET
                                        const itemName = messageHtmlContent.find(".item-name").length > 0
                                            ? messageHtmlContent.find(".item-name")[0].textContent
                                            : "";
                                        if (itemName) {
                                            const actorIdMerchant = messageHtmlContent.attr("data-actor-id");
                                            let item;
                                            if (actorIdMerchant) {
                                                item = (game.actors?.get(actorIdMerchant)?.items?.find((myItem) => {
                                                    return myItem.name == itemName;
                                                }));
                                            }
                                            else {
                                                item = game.items?.find((myItem) => {
                                                    return myItem.name == itemName;
                                                });
                                            }
                                            if (item?.img) {
                                                elementItemImage.src = item.img;
                                            }
                                            if (!elementItemImage.src ||
                                                elementItemImage.src?.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                                                elementItemImage.src = "";
                                            }
                                        }
                                    }
                                }
                                if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                    elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                                }
                                if (!doNotImageReplacer &&
                                    !doNotPrependImage &&
                                    !elementItemImage.src.endsWith("/game")) {
                                    if (
                                    // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                    !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                        // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                        !(game.system.id === "pf2e" &&
                                            messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                        elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                        elementItemName.prepend(elementItemImage);
                                    }
                                }
                                // DAMAGE TYPES
                                if (images &&
                                    images.iconsDamageType.length > 0 &&
                                    ChatPortrait.settings.useImageReplacerDamageType) {
                                    const elementItemContainerDamageTypes = (document.createElement("div"));
                                    for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                        const elementItemImage2 = (document.createElement("img"));
                                        const size = ChatPortrait.settings.portraitSizeItem;
                                        if (size && size > 0) {
                                            elementItemImage2.width = size;
                                            elementItemImage2.height = size;
                                        }
                                        // Just ignore if a image is provided
                                        if (itemImage.length > 0) {
                                            elementItemImage2.src = itemImage; //images[1];
                                        }
                                        if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                            elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                        }
                                        elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                    }
                                    // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                    // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                    // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                    elementItemName.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemName.nextSibling);
                                }
                            }
                            else {
                                if (ChatPortrait.useImageReplacer(html)) {
                                    const elementItemImage = (document.createElement("img"));
                                    const size = ChatPortrait.settings.portraitSizeItem;
                                    if (size && size > 0) {
                                        elementItemImage.width = size;
                                        elementItemImage.height = size;
                                    }
                                    if (!doNotImageReplacer &&
                                        (!elementItemImage.src ||
                                            elementItemImage.src?.includes(CONSTANTS.DEF_TOKEN_IMG_NAME))) {
                                        // TODO DA RIVEDERE
                                        elementItemImage.src = ""; // ChatPortrait.settings.displayUnknownPlaceHolderItemIcon;
                                        if (messageHtmlContent) {
                                            // PATCH MODULE MERCHANT SHEET
                                            const itemName = messageHtmlContent.find(".item-name").length > 0
                                                ? messageHtmlContent.find(".item-name")[0].textContent
                                                : "";
                                            if (itemName) {
                                                const actorIdMerchant = (messageHtmlContent.attr("data-actor-id"));
                                                let item;
                                                if (actorIdMerchant) {
                                                    item = (game.actors
                                                        ?.get(actorIdMerchant)
                                                        ?.items?.find((myItem) => {
                                                        return myItem.name == itemName;
                                                    }));
                                                }
                                                else {
                                                    item = game.items?.find((myItem) => {
                                                        return myItem.name == itemName;
                                                    });
                                                }
                                                if (item?.img) {
                                                    elementItemImage.src = item.img;
                                                }
                                                if (!elementItemImage.src ||
                                                    elementItemImage.src?.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                                                    elementItemImage.src = "";
                                                }
                                            }
                                        }
                                    }
                                    if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                        elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                                    }
                                    if (!doNotImageReplacer &&
                                        !doNotPrependImage &&
                                        !elementItemImage.src.endsWith("/game")) {
                                        if (
                                        // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                        !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                            // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                            !(game.system.id === "pf2e" &&
                                                messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                            elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                            elementItemName.prepend(elementItemImage);
                                        }
                                    }
                                    // DAMAGE TYPES
                                    if (images &&
                                        images.iconsDamageType.length > 0 &&
                                        ChatPortrait.settings.useImageReplacerDamageType) {
                                        const elementItemContainerDamageTypes = (document.createElement("div"));
                                        for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                            const elementItemImage2 = (document.createElement("img"));
                                            const size = ChatPortrait.settings.portraitSizeItem;
                                            if (size && size > 0) {
                                                elementItemImage2.width = size;
                                                elementItemImage2.height = size;
                                            }
                                            // Just ignore if a image is provided
                                            if (itemImage.length > 0) {
                                                elementItemImage2.src = itemImage; //images[1];
                                            }
                                            if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                                elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                            }
                                            elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                        }
                                        // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                        // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                        // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                        elementItemName.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemName.nextSibling);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            else {
                for (let i = 0; i < elementItemTextList.length; i++) {
                    const elementItemText = elementItemTextList[i];
                    if (!elementItemText.classList.contains(`chat-portrait-text-size-name-${gameSystemId}`)) {
                        elementItemText.classList.add(`chat-portrait-text-size-name-${gameSystemId}`);
                    }
                    let value = "";
                    let images = { iconMainReplacer: "", iconsDamageType: [] };
                    if (ChatPortrait.useImageReplacer(html)) {
                        images = ChatPortrait.getImagesReplacerAsset(imageReplacerToUse, elementItemText.innerText, elementItemContentList[i]);
                        if (images && images.iconMainReplacer) {
                            value = images.iconMainReplacer;
                        }
                    }
                    if (value) {
                        if (elementItemImageList.length > 0) {
                            const elementItemImage = elementItemImageList[i];
                            if (!elementItemImage) {
                                continue;
                            }
                            const size = ChatPortrait.settings.portraitSizeItem;
                            if (size && size > 0) {
                                elementItemImage.width = size;
                                elementItemImage.height = size;
                            }
                            // Just ignore if a image is provided
                            //if(!elementItemImage.src || elementItemImage.src?.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME)){
                            if (value.length > 0 && !doNotImageReplacer) {
                                elementItemImage.src = value;
                            }
                            //}
                            if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                            }
                            if (!doNotImageReplacer && !doNotPrependImage && !elementItemImage.src.endsWith("/game")) {
                                if (
                                // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                    // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                    !(game.system.id === "pf2e" &&
                                        messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                    elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                    elementItemText.prepend(elementItemImage);
                                }
                            }
                            // DAMAGE TYPES
                            if (images &&
                                images.iconsDamageType.length > 0 &&
                                ChatPortrait.settings.useImageReplacerDamageType) {
                                const elementItemContainerDamageTypes = (document.createElement("div"));
                                for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                    const elementItemImage2 = (document.createElement("img"));
                                    const size = ChatPortrait.settings.portraitSizeItem;
                                    if (size && size > 0) {
                                        elementItemImage2.width = size;
                                        elementItemImage2.height = size;
                                    }
                                    // Just ignore if a image is provided
                                    if (itemImage.length > 0) {
                                        elementItemImage2.src = itemImage; //images[1];
                                    }
                                    if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                        elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                    }
                                    elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                }
                                // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                elementItemText.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemText.nextSibling);
                            }
                        }
                        else {
                            if (ChatPortrait.useImageReplacer(html)) {
                                const elementItemImage = (document.createElement("img"));
                                const size = ChatPortrait.settings.portraitSizeItem;
                                if (size && size > 0) {
                                    elementItemImage.width = size;
                                    elementItemImage.height = size;
                                }
                                // Just ignore if a image is provided
                                //if(!elementItemImage.src || elementItemImage.src?.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME)){
                                if (value.length > 0 && !doNotImageReplacer) {
                                    elementItemImage.src = value;
                                }
                                //}
                                if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                    elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                                }
                                if (!doNotImageReplacer &&
                                    !doNotPrependImage &&
                                    !elementItemImage.src.endsWith("/game")) {
                                    if (
                                    // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                    !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                        // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                        !(game.system.id === "pf2e" &&
                                            messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                        elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                        elementItemText.prepend(elementItemImage);
                                    }
                                }
                                // DAMAGE TYPES
                                if (images &&
                                    images.iconsDamageType.length > 0 &&
                                    ChatPortrait.settings.useImageReplacerDamageType) {
                                    const elementItemContainerDamageTypes = (document.createElement("div"));
                                    for (const [index, itemImage] of images.iconsDamageType.entries()) {
                                        const elementItemImage2 = (document.createElement("img"));
                                        const size = ChatPortrait.settings.portraitSizeItem;
                                        if (size && size > 0) {
                                            elementItemImage2.width = size;
                                            elementItemImage2.height = size;
                                        }
                                        // Just ignore if a image is provided
                                        if (itemImage.length > 0) {
                                            elementItemImage2.src = itemImage; //images[1];
                                        }
                                        if (!elementItemImage2.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                            elementItemImage2.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                        }
                                        elementItemContainerDamageTypes.appendChild(elementItemImage2);
                                    }
                                    // https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
                                    // If elementItemText does not have a next sibling, then it must be the last child — elementItemText.nextSibling returns null,
                                    // and elementItemContainerDamageTypes is inserted at the end of the child node list (immediately after elementItemText).
                                    elementItemText.parentNode?.insertBefore(elementItemContainerDamageTypes, elementItemText.nextSibling);
                                }
                            }
                        }
                    }
                    else {
                        if (elementItemImageList.length > 0) {
                            const elementItemImage = elementItemImageList[i];
                            if (!elementItemImage) {
                                continue;
                            }
                            const size = ChatPortrait.settings.portraitSizeItem;
                            if (size && size > 0) {
                                elementItemImage.width = size;
                                elementItemImage.height = size;
                            }
                            if (!elementItemImage.src || elementItemImage.src?.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                                elementItemImage.src = ChatPortrait.settings.displayUnknownPlaceHolderItemIcon;
                            }
                            if (elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                                elementItemImage.classList.remove(`chat-portrait-message-portrait-${gameSystemId}`);
                            }
                            if (!doNotImageReplacer && !doNotPrependImage && !elementItemImage.src.endsWith("/game")) {
                                if (
                                // PATCH FOR MONK JOURNAL https://github.com/p4535992/foundryvtt-chat-portrait/issues/16
                                !elementItemImage.classList.contains(`chat-actor-icon`) &&
                                    // PATCH FOR PF2E DAMAGE https://github.com/p4535992/foundryvtt-chat-portrait/issues/15
                                    !(game.system.id === "pf2e" &&
                                        messageContent.querySelectorAll(".damage-application")?.length > 0)) {
                                    elementItemImage.classList.add(`chat-portrait-image-size-name-${gameSystemId}`);
                                    elementItemText.prepend(elementItemImage);
                                }
                            }
                        }
                        else {
                            if (ChatPortrait.useImageReplacer(html)) {
                                // REMOVED SEEM OVERKILL
                                /*
                                const elementItemImage:HTMLImageElement = <HTMLImageElement> document.createElement("img");
                                if(!elementItemImage){
                                    continue;
                                }
                                const size: number = ChatPortrait.settings.portraitSizeItem;
                                if(size && size > 0){
                                    elementItemImage.width = size;
                                    elementItemImage.height = size;
                                }
                                if( !doNotImageReplacer && (!elementItemImage.src || elementItemImage.src?.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME))){
                                    elementItemImage.src = ChatPortrait.settings.displayUnknownPlaceHolderItemIcon;
                                }
                                if(!elementItemImage.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)){
                                    elementItemImage.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                                }
                                if(!isRollTable) elementItemText.prepend(elementItemImage);
                                */
                            }
                        }
                    }
                    if (ChatPortrait.shouldOverrideMessageUnknown(messageData)) {
                        elementItemText.innerText = ChatPortrait.settings.displayUnknownPlaceHolderItemName;
                    }
                }
            }
            ChatPortrait.setCustomStylingText(html, messageData, authorColor, gameSystemId);
            ChatPortrait.setChatMessageBackground(html, messageData, authorColor);
            ChatPortrait.setChatMessageBorder(html, messageData, authorColor);
            // Final settings
            if (ChatPortrait.settings.displayPlayerName) {
                ChatPortrait.appendPlayerName(headerTextElement3, messageSender, speaker.author, gameSystemId);
                // ChatPortrait.appendPlayerName(headerTextElement, messageSender, speaker.author, gameSystemId);
            }
            if (ChatPortrait.settings.displayMessageTag) {
                ChatPortrait.injectMessageTag(html, messageData, headerTextElement3, gameSystemId);
                // ChatPortrait.injectMessageTag(html, messageData, headerTextElement, gameSystemId);
                ChatPortrait.injectWhisperParticipants(html, messageData, gameSystemId);
            }
            ChatLink.prepareEvent(chatMessage, html, speakerInfo, gameSystemId);
            return html;
        });
    }
    /**
     * Load the appropriate actor image path for a given message, leveraging token or actor or actor search.
     * @param  {{scene?:string;actor?:string;token?:string;alias?:string;}} speaker
     * @returns string
     */
    static loadImagePathForChatMessage(speakerInfo) {
        const message = speakerInfo.message
            ? speakerInfo.message
            : speakerInfo.document
                ? speakerInfo.document
                : speakerInfo;
        const speaker = message.speaker ? message.speaker : speakerInfo;
        const isOOC = ChatPortrait.getMessageTypeVisible(speakerInfo) === CONST.CHAT_MESSAGE_TYPES.OOC;
        const imgFinal = CONSTANTS.DEF_TOKEN_IMG_PATH;
        const flaggedPreChatSrc = message.flags?.[CONSTANTS.MODULE_NAME]?.src;
        if (flaggedPreChatSrc) {
            if (message.user && isOOC) {
                const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
                if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    return imgAvatar;
                }
                else {
                    warn(`No specific avatar player image found it for player "'${ChatPortrait.getUserNameFromChatMessage(message)}'"`);
                    return imgAvatar ? imgAvatar : imgFinal;
                }
            }
            else {
                return flaggedPreChatSrc;
            }
        }
        if (!ChatPortrait.settings.disablePortraitForAliasGmMessage &&
            ChatPortrait.settings.setUpPortraitForAliasGmMessage?.length > 0) {
            const userByAlias = game.users?.find((u) => {
                return (speakerInfo.alias === u.name || speakerInfo.author.name === u.name) && u?.isGM;
            });
            if (userByAlias) {
                return ChatPortrait.settings.setUpPortraitForAliasGmMessage;
            }
        }
        if (message.user && isOOC) {
            const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
            if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgAvatar;
            }
            else {
                warn('No specific avatar player image found it for player "' +
                    ChatPortrait.getUserNameFromChatMessage(message) +
                    '"');
                return imgAvatar ? imgAvatar : imgFinal;
            }
        }
        if (speaker) {
            // CASE 1
            if ((!speaker.token && !speaker.actor) || ChatPortrait.settings.useAvatarImage) {
                if (message.user && ChatPortrait.settings.useAvatarImage && !ChatPortrait.isSpeakerGM(message)) {
                    const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
                    if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                        return imgAvatar;
                    }
                    else {
                        warn('No specific avatar player image found it for player "' +
                            ChatPortrait.getUserNameFromChatMessage(message) +
                            '"');
                        return imgAvatar ? imgAvatar : imgFinal;
                    }
                }
                else if (!speaker.token && !speaker.actor) {
                    if (message.user && ChatPortrait.settings.useAvatarImage) {
                        const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
                        if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                            return imgAvatar;
                        }
                        else {
                            // This is just a partial solution....
                            // const currentToken:Token = ChatPortrait.getFirstPlayerToken();
                            // if(currentToken){
                            //   speaker.token = currentToken;
                            //   return currentToken.document.texture.src;
                            // }else{
                            //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
                            //return imgAvatar ? imgAvatar : imgFinal;
                            // }
                        }
                    }
                    else {
                        //warn("No message user is found");
                        return imgFinal;
                    }
                }
            }
            // It's a chat message associated with an actor
            let useTokenImage = ChatPortrait.settings.useTokenImage;
            const actor = ChatPortrait.getActorFromSpeaker(speaker);
            const doNotUseTokenImageWithSpecificType = ChatPortrait.settings
                .doNotUseTokenImageWithSpecificType
                ? String(ChatPortrait.settings.doNotUseTokenImageWithSpecificType).split(",")
                : [];
            if (doNotUseTokenImageWithSpecificType.length > 0 &&
                doNotUseTokenImageWithSpecificType.includes(actor?.type)) {
                useTokenImage = false;
            }
            // Make sense only for player and for non GM
            if (actor?.type == "character" &&
                ChatPortrait.settings.useAvatarImage &&
                !ChatPortrait.isSpeakerGM(message)) {
                const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
                if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    return imgAvatar;
                }
                else {
                    //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
                }
            }
            // let tokenDocument: TokenDocument;
            let tokenDocumentData;
            if (speaker.token) {
                let tokenDocument = ChatPortrait.getTokenFromSpeaker(speaker);
                // THIS PIECE OF CODE IS PROBABLY NOT NECESSARY ANYMORE ??
                if (!tokenDocument) {
                    try {
                        tokenDocument = (canvas?.tokens?.getDocuments().find((token) => token.id === speaker.token));
                        //token = canvas?.tokens?.getDocuments().find(speaker.token);
                    }
                    catch (e) {
                        // Do nothing
                    }
                    if (!tokenDocument) {
                        tokenDocumentData = (game.scenes?.get(speaker.scene)?.tokens?.find((t) => t.id === speaker.token)); // Deprecated on 0.8.6
                    }
                    else {
                        tokenDocumentData = tokenDocument;
                    }
                }
                else {
                    tokenDocumentData = tokenDocument;
                }
                let imgToken = "";
                if (tokenDocumentData) {
                    if (useTokenImage) {
                        //@ts-ignore
                        if (tokenDocumentData?.randomImg) {
                            //@ts-ignore
                            if (tokenDocumentData?.texture?.src) {
                                //@ts-ignore
                                imgToken = tokenDocumentData.texture.src;
                            }
                            else {
                                // particolar case...
                                imgToken = CONSTANTS.DEF_TOKEN_IMG_PATH;
                            }
                        }
                        //@ts-ignore
                        if (tokenDocumentData?.texture?.src) {
                            //@ts-ignore
                            imgToken = tokenDocumentData.texture.src;
                        }
                        //@ts-ignore
                        if ((!imgToken || ChatPortrait.isWildcardImage(imgToken)) && tokenDocumentData?.img) {
                            //@ts-ignore
                            imgToken = tokenDocumentData?.texture.src;
                        }
                    }
                    else {
                        //@ts-ignore
                        if (tokenDocumentData?.actorData?.img) {
                            //@ts-ignore
                            imgToken = tokenDocumentData.actorData.img;
                        }
                        if ((!imgToken || ChatPortrait.isWildcardImage(imgToken)) &&
                            //@ts-ignore
                            tokenDocumentData?.actorData?.img) {
                            //@ts-ignore
                            imgToken = tokenDocumentData?.actorData.img;
                        }
                    }
                    // if((!imgToken || ChatPortrait.isWildcardImage(imgToken)) || imgToken.includes(CHAT_PORTRAIT_DEF_TOKEN_IMG_NAME)){
                    //return useTokenImage ? <string>actor?.token.texture.src : <string>actor?.token?.texture.src; // actor?.img; // Deprecated on 0.8.6
                    //return useTokenImage ? actor?.token?.texture.src; : actor.img; // actor?.img; // Deprecated on 0.8.6
                    //}
                    if (imgToken &&
                        !ChatPortrait.isWildcardImage(imgToken) &&
                        !imgToken.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                        return imgToken;
                    }
                }
            }
            let imgActor = "";
            if (actor) {
                if ((!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) && useTokenImage) {
                    //@ts-ignore
                    imgActor = actor?.token?.texture.src;
                    if (imgActor && ChatPortrait.isWildcardImage(imgActor)) {
                        imgActor = "";
                    }
                }
                if ((!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) && useTokenImage) {
                    //@ts-ignore
                    imgActor = actor?.token?.texture.src;
                    if (imgActor && ChatPortrait.isWildcardImage(imgActor)) {
                        imgActor = "";
                    }
                }
                if (!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    imgActor = actor.img;
                }
                if (imgActor && !imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    return imgActor;
                }
            }
            const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
            // if (isMonkTokenBarXP(html)) {
            //   return imgAvatar;
            // } else {
            if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgAvatar;
            }
            else {
                //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
                return imgAvatar ? imgAvatar : CONSTANTS.INV_UNIDENTIFIED_BOOK;
            }
            // }
            //return  useTokenImage ? <string>actor?.token.texture.src : <string>actor?.img;
            //return useTokenImage ? actor?.token?.texture.src : actor.img;
        }
        else if (message && message.user) {
            // CASE 2
            const imgAvatar = ChatPortrait.getUserAvatarImageFromChatMessage(message);
            if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgAvatar;
            }
            else {
                warn("No specific avatar player image found it for player '" +
                    ChatPortrait.getUserNameFromChatMessage(message) +
                    "'");
                return imgAvatar ? imgAvatar : imgFinal;
            }
        }
        else {
            // CASE 3
            return imgFinal;
        }
    }
    /**
     * Generate portrait HTML Image Element to insert into chat messages.
     * @param  {string} imgPath
     * @returns HTMLImageElement
     */
    static async generatePortraitImageElement(imgPath, gameSystemId) {
        if (!imgPath) {
            return;
        }
        const img = document.createElement("img");
        img.src = "";
        const size = ChatPortrait.settings.portraitSize;
        // Support for video or webm file
        //let thumb = diff.img;
        //if (VideoHelper.hasVideoExtension(diff.img))
        //    thumb = await ImageHelper.createThumbnail(diff.img, { width: 48, height: 48 });
        //let thumb = CONSTANTS.DEF_TOKEN_IMG_PATH;
        if (imgPath.includes(".webm") || ChatPortrait.isVideo(imgPath)) {
            try {
                const video = ChatPortrait.createVideoElement(imgPath);
                if (!video) {
                    const imgThumb = size && size > 0
                        ? await ImageHelper.createThumbnail(imgPath, { width: size, height: size })
                        : await ImageHelper.createThumbnail(imgPath);
                    if (imgPath.includes(".webm")) {
                        img.src = imgThumb.thumb;
                        // If a url we need these anyway
                        if (size && size > 0) {
                            img.width = size;
                            img.height = size;
                        }
                    }
                    else {
                        img.src = imgThumb.src;
                        if (size && size > 0) {
                            // If a url we need these anyway
                            img.width = size;
                            img.height = size;
                        }
                    }
                }
                else {
                    // If a url we need these anyway
                    if (size && size > 0) {
                        video.width = size;
                        video.height = size;
                    }
                    if (!video.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
                        video.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
                    }
                    return video;
                }
            }
            catch {
                img.src = imgPath;
                if (size && size > 0) {
                    img.width = size;
                    img.height = size;
                }
            }
        }
        else {
            img.src = imgPath;
            if (size && size > 0) {
                img.width = size;
                img.height = size;
            }
        }
        if (!img.classList.contains(`chat-portrait-message-portrait-${gameSystemId}`)) {
            img.classList.add(`chat-portrait-message-portrait-${gameSystemId}`);
        }
        return img;
    }
    /**
     * Set portrait image border shape
     * @param  {HTMLImageElement} img
     * @param  {string} authorColor
     */
    static setImageBorder(img, authorColor) {
        const borderShape = ChatPortrait.settings.borderShape;
        const borderWidth = ChatPortrait.settings.borderWidth;
        const borderColor = ChatPortrait.settings.useUserColorAsBorderColor
            ? authorColor
            : ChatPortrait.settings.borderColor;
        switch (borderShape) {
            case "square":
                img.style.border = `${borderWidth}px solid ${borderColor}`;
                break;
            case "circle":
                img.style.border = `${borderWidth}px solid ${borderColor}`;
                img.style.borderRadius = "50%";
                break;
            case "none":
                img.style.border = "none";
                break;
        }
    }
    static setCustomStylingText(html, messageData, authorColor, gameSystemId) {
        const elementItemTextList = html.find(`.chat-portrait-text-size-name-${gameSystemId}`);
        for (let i = 0; i < elementItemTextList.length; i++) {
            const elementItemText = elementItemTextList[i];
            if (elementItemText) {
                if (ChatPortrait.settings.customStylingMessageText) {
                    elementItemText.style.cssText = ChatPortrait.settings.customStylingMessageText;
                }
                // else if (game.settings.get(CONSTANTS.MODULE_NAME, 'customStylingMessageSystem')) {
                //   if (!elementItemText.classList.contains(`chat-portrait-system-${gameSystemId}`)) {
                //     elementItemText.classList.add(`chat-portrait-system-${gameSystemId}`);
                //   }
                // }
                // You need this anyway
                //elementItemText.style.display = 'flex';
            }
        }
        const elementItemImageList = html.find(`.chat-portrait-image-size-name-${gameSystemId}`);
        for (let i = 0; i < elementItemImageList.length; i++) {
            const elementItemImage = elementItemTextList[i];
            if (elementItemImage) {
                if (ChatPortrait.settings.customStylingMessageImage) {
                    elementItemImage.style.cssText = ChatPortrait.settings.customStylingMessageImage;
                }
                // else if (game.settings.get(CONSTANTS.MODULE_NAME, 'customStylingMessageSystem')) {
                //   if (!elementItemImage.classList.contains(`chat-portrait-system-${gameSystemId}`)) {
                //     elementItemImage.classList.add(`chat-portrait-system-${gameSystemId}`);
                //   }
                // }
            }
        }
    }
    /**
     * Set the background color of the entire message to be the color for the author.
     * Only do so if
     *  - chatBackgroundColor setting is true AND
     * @param  {JQuery} html
     * @param  {MessageRenderData} messageData
     * @param  {string} authorColor
     */
    static setChatMessageBackground(html, messageData, authorColor) {
        const useUserBackgroundColor = ChatPortrait.settings.useUserColorAsChatBackgroundColor;
        if (useUserBackgroundColor) {
            //html[0].setAttribute('style','background-color:' + authorColor + ';background-blend-mode:screen;');
            html[0].style.background = "url(../ui/parchment.jpg) repeat";
            html[0].style.backgroundColor = authorColor;
            //@ts-ignore
            html[0].style.backgroundBlendMode = "screen";
        }
    }
    /**
     * Set the border color of the entire message to be the color for the author.
     * Only do so if
     *  - chatBorderColor setting is true AND
     *  - someone further up the chain hasn't already changed the color
     * @param  {JQuery} html
     * @param  {MessageRenderData} messageData
     * @param  {string} authorColor
     */
    static setChatMessageBorder(html, messageData, authorColor) {
        const useUserBorderColor = ChatPortrait.settings.useUserColorAsChatBorderColor;
        // only override the border color if someone further up the chain hasn't already done so.
        if (useUserBorderColor && !messageData.borderColor) {
            html[0].style.borderColor = authorColor;
            messageData.borderColor = authorColor;
        }
    }
    static get settings() {
        //return mergeObject(this.defaultSettings, <ChatPortraitSettings>game.settings.get(MODULE_NAME, 'settings'));
        //return mergeObject(this.defaultSettings,{
        return {
            //borderShapeList: Settings.getBorderShapeList(),
            useTokenImage: SettingsForm.getUseTokenImage(),
            doNotUseTokenImageWithSpecificType: SettingsForm.getDoNotUseTokenImageWithSpecificType(),
            useTokenName: SettingsForm.getUseTokenName(),
            portraitSize: SettingsForm.getPortraitSize(),
            portraitSizeItem: SettingsForm.getPortraitSizeItem(),
            borderShape: SettingsForm.getBorderShape(),
            useUserColorAsBorderColor: SettingsForm.getUseUserColorAsBorderColor(),
            borderColor: SettingsForm.getBorderColor(),
            borderWidth: SettingsForm.getBorderWidth(),
            useUserColorAsChatBackgroundColor: SettingsForm.getUseUserColorAsChatBackgroundColor(),
            useUserColorAsChatBorderColor: SettingsForm.getUseUserColorAsChatBorderColor(),
            // flavorNextToPortrait: SettingsForm.getFlavorNextToPortrait(),
            forceNameSearch: SettingsForm.getForceNameSearch(),
            // hoverTooltip: SettingsForm.getHoverTooltip(),
            textSizeName: SettingsForm.getTextSizeName(),
            displaySetting: SettingsForm.getDisplaySetting(),
            useAvatarImage: SettingsForm.getUseAvatarImage(),
            displayPlayerName: SettingsForm.getDisplayPlayerName(),
            displayUnknown: SettingsForm.getDisplayUnknown(),
            displayUnknownPlaceHolderActorName: SettingsForm.getDisplayUnknownPlaceHolderActorName(),
            displayUnknownPlaceHolderItemName: SettingsForm.getDisplayUnknownPlaceHolderItemName(),
            displayUnknownPlaceHolderItemIcon: SettingsForm.getDisplayUnknownPlaceHolderItemIcon(),
            displaySettingOTHER: SettingsForm.getDisplaySettingOTHER(),
            displaySettingOOC: SettingsForm.getDisplaySettingOOC(),
            displaySettingIC: SettingsForm.getDisplaySettingIC(),
            displaySettingEMOTE: SettingsForm.getDisplaySettingEMOTE(),
            displaySettingWHISPER: SettingsForm.getDisplaySettingWHISPER(),
            displaySettingROLL: SettingsForm.getDisplaySettingROLL(),
            displaySettingWhisperToOther: SettingsForm.getDisplaySettingWhisperToOther(),
            // customStylingMessageSystem: SettingsForm.getCustomStylingMessageSystem(),
            customStylingMessageText: SettingsForm.getCustomStylingMessageText(),
            customStylingMessageImage: SettingsForm.getCustomStylingMessageImage(),
            displayMessageTag: SettingsForm.getDisplayMessageTag(),
            // displayMessageTagNextToName: SettingsForm.getDisplayMessageTagNextToName(),
            useImageReplacer: SettingsForm.getUseImageReplacer(),
            useImageReplacerDamageType: SettingsForm.getUseImageReplacerDamageType(),
            applyOnCombatTracker: SettingsForm.getApplyOnCombatTracker(),
            // applyPreCreateChatMessagePatch: SettingsForm.getApplyPreCreateChatMessagePatch(),
            disablePortraitForAliasGmMessage: SettingsForm.getDisablePortraitForAliasGmMessage(),
            setUpPortraitForAliasGmMessage: SettingsForm.getSetUpPortraitForAliasGmMessage()
        };
    }
    /**
     * Get default settings object.
     * @returns ChatPortraitSetting
     */
    static get defaultSettings() {
        return {
            useTokenImage: false,
            doNotUseTokenImageWithSpecificType: "",
            useTokenName: false,
            portraitSize: 36,
            portraitSizeItem: 36,
            borderShape: "square",
            useUserColorAsBorderColor: true,
            borderColor: "#000000",
            borderWidth: 2,
            useUserColorAsChatBackgroundColor: false,
            useUserColorAsChatBorderColor: false,
            // flavorNextToPortrait: false,
            forceNameSearch: false,
            // hoverTooltip: false,
            textSizeName: 0,
            displaySetting: "allCards",
            useAvatarImage: false,
            displayPlayerName: false,
            displayUnknown: "none",
            displayUnknownPlaceHolderActorName: "Unknown Actor",
            displayUnknownPlaceHolderItemName: "Unknown Item",
            displayUnknownPlaceHolderItemIcon: `modules/${CONSTANTS.MODULE_NAME}/assets/inv-unidentified.png`,
            displaySettingOTHER: true,
            displaySettingOOC: true,
            displaySettingIC: true,
            displaySettingEMOTE: true,
            displaySettingWHISPER: true,
            displaySettingROLL: true,
            displaySettingWhisperToOther: false,
            // customStylingMessageSystem: false,
            customStylingMessageText: "",
            customStylingMessageImage: "",
            displayMessageTag: false,
            // displayMessageTagNextToName: false,
            useImageReplacer: true,
            useImageReplacerDamageType: true,
            applyOnCombatTracker: false,
            // applyPreCreateChatMessagePatch: false,
            disablePortraitForAliasGmMessage: false,
            setUpPortraitForAliasGmMessage: ""
        };
    }
    // static getSpeakerImage = function (message, useTokenImage):string {
    //   const speaker = message.speaker;
    //   if (speaker) {
    //       if (speaker.token && useTokenImage) {
    //           const token = canvas?.tokens?.getDocuments().get(speaker.token);
    //           if (token) {
    //               return token.texture.src;
    //           }
    //       }
    //       if (speaker.actor && !useTokenImage) {
    //           const actor = Actors.instance.get(speaker.actor);
    //           if (actor) {
    //             return actor.img;
    //           }
    //       }
    //   }
    //   return "icons/svg/mystery-man.svg";
    // }
    // static showSpeakerImage = function (message, useTokenImage):boolean {
    //   const speaker = message.speaker;
    //   if (!speaker) {
    //       return false;
    //   } else {
    //     let bHasImage = false;
    //     if (speaker.token && useTokenImage) {
    //         const token = canvas?.tokens?.getDocuments().get(speaker.token);
    //         if (token) {
    //             bHasImage = bHasImage || token.texture.src != null;
    //         }
    //     }
    //     if (speaker.actor) {
    //         const actor = Actors.instance.get(speaker.actor);
    //         if (actor) {
    //             bHasImage = bHasImage || actor.img != null;
    //         }
    //     }
    //     if (!bHasImage) {
    //         return false;
    //     }else{
    //       return true;
    //     }
    //   }
    // }
    static getActorFromSpeaker(speaker) {
        let actor = game.actors?.get(speaker.actor);
        if (!actor) {
            actor = game.actors?.tokens[speaker.token];
        }
        if (!actor) {
            //actor = game.actors.get(speaker.actor); // Deprecated on 0.8.6
            actor = Actors.instance.get(speaker.actor);
        }
        const forceNameSearch = ChatPortrait.settings.forceNameSearch;
        if (!actor && forceNameSearch) {
            actor = game.actors?.find((a) => a.token?.name === speaker.alias);
        }
        return actor;
    }
    static getActorFromActorID(actorID, tokenID) {
        let actor = game.actors?.get(actorID);
        if (!actor) {
            actor = game.actors?.tokens[tokenID];
        }
        if (!actor) {
            //actor = game.actors.get(actorID); // Deprecated on 0.8.6
            actor = Actors.instance.get(actorID);
        }
        // const forceNameSearch = ChatPortrait.settings.forceNameSearch;
        // if (!actor && forceNameSearch) {
        //     actor = game.actors?.find((a: Actor) => a.token.name === speaker.alias);
        // }
        return actor;
    }
    static getImagesReplacerAsset(imageReplacer, innerText, elementItemContent) {
        //let value:string[] = new Array();
        const value = new ImageReplacerData();
        let innerTextTmp = innerText;
        //let betterRollLabelAttack = ($(elementItemContent).find(".br5e-roll-label")[0])?.innerText;
        //let betterRollLabelDamage = ($(elementItemContent).find(".br5e-roll-label")[1])?.innerText;
        // const fullTextContent = $(elementItemContent)[0]?.innerText;
        const textToCheck = $(elementItemContent)[0]?.innerText || "";
        const fullTextContent = textToCheck.toLowerCase().trim();
        // TODO special word for integration multisystem and help to identify the chat text
        const check = i18n(`${CONSTANTS.MODULE_NAME}.labels.check`);
        const ability = i18n(`${CONSTANTS.MODULE_NAME}.labels.ability`);
        const skill = i18n(`${CONSTANTS.MODULE_NAME}.labels.skill`);
        const checkEN = i18n(`${CONSTANTS.MODULE_NAME}.labels.checkEN`);
        const abilityEN = i18n(`${CONSTANTS.MODULE_NAME}.labels.abilityEN`);
        const skillEN = i18n(`${CONSTANTS.MODULE_NAME}.labels.skillEN`);
        const innerTextDamageTmp = fullTextContent; //Damage -Slashing
        if (innerTextTmp) {
            // Clean up the string for multisystem (D&D5, PF2, ecc.)
            //let text:string = "";
            innerTextTmp = innerTextTmp.toLowerCase().trim();
            const arr1 = innerTextTmp.split(/\r?\n/);
            for (let i = 0; i < arr1.length; i++) {
                let text = arr1[i];
                if (text) {
                    // Keywords to avoid for all the system ?
                    if (text.indexOf(check) !== -1 ||
                        text.indexOf(ability) !== -1 ||
                        text.indexOf(skill) !== -1 ||
                        text.indexOf(checkEN) !== -1 ||
                        text.indexOf(abilityEN) !== -1 ||
                        text.indexOf(skillEN) !== -1) {
                        // is ok ??
                    }
                    else {
                        continue;
                    }
                    text = text.replace(/\W/g, " ");
                    text = text.replace(skill, "");
                    text = text.replace(check, "");
                    text = text.replace(ability, "");
                    text = text.replace(skillEN, "");
                    text = text.replace(checkEN, "");
                    text = text.replace(abilityEN, "");
                    text = text.replace(/[0-9]/g, "");
                    text = text.toLowerCase().trim();
                    for (const objKey in imageReplacer) {
                        const obj = imageReplacer[objKey];
                        if (obj) {
                            const key = obj.name;
                            const mykeyvalue = i18n(key);
                            if (mykeyvalue) {
                                //mykeyvalue = mykeyvalue.toLowerCase().trim();
                                //let arr2 = mykeyvalue.split(/\r?\n/);
                                //for (let j = 0; j < arr2.length; j++) {
                                let keyValue = mykeyvalue; //arr2[j];
                                if (keyValue) {
                                    keyValue = keyValue.replace(/\W/g, " ");
                                    keyValue = keyValue.replace(skill, "");
                                    keyValue = keyValue.replace(check, "");
                                    keyValue = keyValue.replace(ability, "");
                                    keyValue = keyValue.replace(skillEN, "");
                                    keyValue = keyValue.replace(checkEN, "");
                                    keyValue = keyValue.replace(abilityEN, "");
                                    keyValue = keyValue.replace(/[0-9]/g, "");
                                    keyValue = keyValue.toLowerCase().trim();
                                    if (text.trim().indexOf(i18n(keyValue).toLowerCase()) !== -1) {
                                        // if (text.trim().indexOf(keyValue) !== -1) {
                                        //value.push(imageReplacer[key]);
                                        value.iconMainReplacer = obj.icon; //imageReplacer[key];
                                        break;
                                    }
                                }
                                //}
                            }
                        }
                    }
                }
            }
        } // InnerTexTmp
        if (ChatPortrait.settings.useImageReplacerDamageType && innerTextDamageTmp) {
            const damageTypes = [];
            const arr4 = innerTextDamageTmp.split(/\r?\n/);
            for (let i = 0; i < arr4.length; i++) {
                let textDamage = arr4[i];
                if (textDamage) {
                    textDamage = textDamage.replace(/\W/g, " ");
                    textDamage = textDamage.replace(skill, "");
                    textDamage = textDamage.replace(check, "");
                    textDamage = textDamage.replace(ability, "");
                    textDamage = textDamage.replace(skillEN, "");
                    textDamage = textDamage.replace(checkEN, "");
                    textDamage = textDamage.replace(abilityEN, "");
                    textDamage = textDamage.replace(/[0-9]/g, "");
                    textDamage = textDamage.toLowerCase().trim();
                    for (const keydamageObjeKey in API.imageReplacerDamageType) {
                        const keydamageObj = API.imageReplacerDamageType[keydamageObjeKey];
                        const keydamage = keydamageObj.name;
                        const mykeydamagevalue = i18n(keydamage);
                        if (mykeydamagevalue) {
                            //mykeydamagevalue = mykeydamagevalue.toLowerCase().trim();
                            //let arr3 = mykeydamagevalue.split(/\r?\n/);
                            //for (let x = 0; x < arr3.length; x++) {
                            let damageValue = mykeydamagevalue; //arr3[x];
                            if (damageValue) {
                                damageValue = damageValue.replace(/\W/g, " ");
                                damageValue = damageValue.replace(skill, "");
                                damageValue = damageValue.replace(check, "");
                                damageValue = damageValue.replace(ability, "");
                                damageValue = damageValue.replace(skillEN, "");
                                damageValue = damageValue.replace(checkEN, "");
                                damageValue = damageValue.replace(abilityEN, "");
                                damageValue = damageValue.replace(/[0-9]/g, "");
                                damageValue = damageValue.toLowerCase().trim();
                                damageValue = " " + damageValue;
                                if (textDamage.trim().indexOf(i18n(damageValue).toLowerCase()) !== -1) {
                                    // if (textDamage.toLowerCase().trim().indexOf(damageValue) !== -1) {
                                    const srcdamageType = keydamageObj.icon; //imageReplacerDamageType[keydamage];
                                    damageTypes.push(srcdamageType);
                                    // Add all damage types
                                }
                            }
                            //}
                        }
                    }
                }
                value.iconsDamageType = damageTypes;
            }
        }
        return value;
    }
    static useImageReplacer(html) {
        if (ChatPortrait.settings.useImageReplacer) {
            // if (isMonkTokenBarXP(html)) {
            //   return false;
            // }
            return true;
        }
        return false;
    }
    static injectMessageTag(html, messageData, messageElement, gameSystemId) {
        /*
        let timestampTag = html.find(".message-timestamp");
        if (ChatPortrait.settings.displayMessageTagNextToName) {
            // timestampTag = html.find(`h4.chat-portrait-text-size-name-${gameSystemId}`);
            timestampTag = html.find(`h4.chat-portrait-text-content-name-${gameSystemId}`);
        }
        */
        //const timestampTag = html.find(`h4.chat-portrait-text-content-name-${gameSystemId}`);
        // const timestampTag = $(messageElement);
        // const indicatorElement = $("<span>");
        // indicatorElement.addClass(`chat-portrait-indicator-${gameSystemId}`);
        const indicatorElement = document.createElement("span");
        if (!indicatorElement.classList.contains(`chat-portrait-indicator-${gameSystemId}`)) {
            indicatorElement.classList.add(`chat-portrait-indicator-${gameSystemId}`);
        }
        const whisperTargets = messageData.whisper;
        const isBlind = messageData.blind || false;
        const isWhisper = whisperTargets?.length > 0 || false;
        const isSelf = isWhisper && whisperTargets.length === 1 && whisperTargets[0] === messageData.user;
        //@ts-ignore
        const isRoll = messageData.rolls !== undefined;
        // Inject tag to the left of the timestamp
        if (isBlind) {
            // indicatorElement.text(game.i18n.localize("CHAT.RollBlind"));
            // timestampTag.before(indicatorElement);
            indicatorElement.innerText = game.i18n.localize("CHAT.RollBlind");
            messageElement.appendChild(indicatorElement);
        }
        else if (isSelf && whisperTargets[0]) {
            // indicatorElement.text(game.i18n.localize("CHAT.RollSelf"));
            // timestampTag.before(indicatorElement);
            indicatorElement.innerText = game.i18n.localize("CHAT.RollSelf");
            messageElement.appendChild(indicatorElement);
        }
        else if (isRoll && isWhisper) {
            // indicatorElement.text(game.i18n.localize("CHAT.RollPrivate"));
            // timestampTag.before(indicatorElement);
            indicatorElement.innerText = game.i18n.localize("CHAT.RollPrivate");
            messageElement.appendChild(indicatorElement);
        }
        else if (isWhisper) {
            // indicatorElement.text(game.i18n.localize("chat-portrait.whisper"));
            // timestampTag.before(indicatorElement);
            indicatorElement.innerText = game.i18n.localize("chat-portrait.whisper");
            messageElement.appendChild(indicatorElement);
        }
    }
    static injectWhisperParticipants(html, messageData, gameSystemId) {
        const alias = messageData.alias;
        const whisperTargetString = messageData.whisperTo;
        const whisperTargetIds = messageData.whisper;
        const isWhisper = whisperTargetIds?.length > 0 || false;
        //@ts-ignore
        const isRoll = messageData.rolls !== undefined;
        const authorId = messageData.user;
        const userId = game.user?.id;
        if (!isWhisper)
            return;
        if (userId !== authorId && !whisperTargetIds.includes(userId))
            return;
        // remove the old whisper to content, if it exists
        html.find(`.chat-portrait-whisper-to-${gameSystemId}`).detach();
        // if this is a roll
        if (isRoll)
            return;
        // add new content
        const messageHeader = html.find(".card-header"); // message-header
        const whisperParticipants = $("<span>");
        whisperParticipants.addClass(`chat-portrait-whisper-to-${gameSystemId}`);
        const whisperFrom = $("<span>");
        whisperFrom.text(`${game.i18n.localize("chat-portrait.from")}: ${alias}`);
        const whisperTo = $("<span>");
        whisperTo.text(`${game.i18n.localize("CHAT.To")}: ${whisperTargetString}`);
        whisperParticipants.append(whisperFrom);
        whisperParticipants.append(whisperTo);
        messageHeader.append(whisperParticipants);
    }
    static isWildcardImage(imgUrl) {
        try {
            const filename = imgUrl.split("/").pop();
            const baseFileName = filename.substr(0, filename.lastIndexOf("."));
            return baseFileName == "*";
        }
        catch (e) {
            //TODO must check other systems
            return false;
        }
    }
    static isVideo(imgSrc) {
        const re = /(?:\.([^.]+))?$/;
        const ext = re.exec(imgSrc)?.[1];
        return ext === "webm";
    }
    static createVideoElement(videoSrc) {
        const video = document.createElement("video");
        video.src = videoSrc;
        video.autoplay = false;
        video.controls = false;
        video.muted = true;
        return video;
    }
    static loadImagePathForCombatTracker(tokenID, actorID, userID, sceneID, isOwnedFromPLayer) {
        const imgFinal = CONSTANTS.DEF_TOKEN_IMG_PATH;
        //
        // CASE 1
        if ((!tokenID && !actorID) || ChatPortrait.settings.useAvatarImage) {
            if (userID && ChatPortrait.settings.useAvatarImage && !ChatPortrait.isGMFromUserID(userID)) {
                const imgAvatar = ChatPortrait.getUserAvatarImageFromUserID(userID);
                if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    return imgAvatar;
                }
                else {
                    warn("No specific avatar player image found it for player '" +
                        ChatPortrait.getUserNameFromUserID(userID) +
                        "'");
                    return imgAvatar ? imgAvatar : imgFinal;
                }
            }
            else if (!tokenID && !actorID) {
                if (userID && ChatPortrait.settings.useAvatarImage) {
                    const imgAvatar = ChatPortrait.getUserAvatarImageFromUserID(userID);
                    if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                        return imgAvatar;
                    }
                    else {
                        // This is just a partial solution....
                        // const currentToken:Token = ChatPortrait.getFirstPlayerToken();
                        // if(currentToken){
                        //   speaker.token = currentToken;
                        //   return currentToken.texture.src;
                        // }else{
                        //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
                        //return imgAvatar ? imgAvatar : imgFinal;
                        // }
                    }
                }
                else {
                    //warn("No message user is found");
                    return imgFinal;
                }
            }
        }
        // It's a chat message associated with an actor
        let useTokenImage = ChatPortrait.settings.useTokenImage;
        const actor = ChatPortrait.getActorFromActorID(actorID, tokenID);
        const doNotUseTokenImageWithSpecificType = ChatPortrait.settings.doNotUseTokenImageWithSpecificType
            ? String(ChatPortrait.settings.doNotUseTokenImageWithSpecificType).split(",")
            : [];
        if (doNotUseTokenImageWithSpecificType.length > 0 &&
            doNotUseTokenImageWithSpecificType.includes(actor?.type)) {
            useTokenImage = false;
        }
        // Make sense only for player and for non GM
        if (actor?.type == "character" &&
            ChatPortrait.settings.useAvatarImage &&
            !ChatPortrait.isGMFromUserID(userID)) {
            const imgAvatar = ChatPortrait.getUserAvatarImageFromUserID(userID);
            if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgAvatar;
            }
            else {
                //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
            }
        }
        let tokenDocument;
        //@ts-ignore
        let tokenDocumentData;
        if (tokenID) {
            tokenDocument = ChatPortrait.getTokenFromIds(sceneID, tokenID, actorID);
            // THIS PIECE OF CODE IS PROBABLY NOT NECESSARY ANYMORE ??
            if (!tokenDocument) {
                try {
                    tokenDocument = (canvas?.tokens?.getDocuments().find((token) => token.id === tokenID));
                    //token = canvas?.tokens?.getDocuments().find(speaker.token);
                }
                catch (e) {
                    // Do nothing
                }
                if (!tokenDocument) {
                    tokenDocumentData = game.scenes?.get(sceneID)?.tokens?.find((t) => t.id === tokenID); // Deprecated on 0.8.6
                }
                else {
                    tokenDocumentData = tokenDocument;
                }
            }
            else {
                tokenDocumentData = tokenDocument;
            }
            let imgToken = "";
            if (tokenDocumentData) {
                if (useTokenImage) {
                    if (tokenDocumentData?.img) {
                        imgToken = tokenDocumentData.img;
                    }
                    if ((!imgToken || ChatPortrait.isWildcardImage(imgToken)) && tokenDocumentData?.img) {
                        imgToken = tokenDocumentData?.img;
                    }
                }
                else {
                    if (tokenDocumentData?.actorData?.img) {
                        imgToken = tokenDocumentData.actorData.img;
                    }
                    if ((!imgToken || ChatPortrait.isWildcardImage(imgToken)) && tokenDocumentData?.actorData?.img) {
                        imgToken = tokenDocumentData.actorData.img;
                    }
                }
                // if((!imgToken || ChatPortrait.isWildcardImage(imgToken)) || imgToken.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)){
                //return useTokenImage ? <string>actor?.token.texture.src  : <string>actor?.token.texture.src ; // actor?.img; // Deprecated on 0.8.6
                //return useTokenImage ? actor?.token.texture.src : actor.img; // actor?.img; // Deprecated on 0.8.6
                //}
                if (imgToken &&
                    !ChatPortrait.isWildcardImage(imgToken) &&
                    !imgToken.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                    return imgToken;
                }
            }
        }
        // MOD COMBAT TRACKER NEED TOKEN RETRIEVE ANYWAY IF TOKEN IS NOT OWNED
        let imgToken = "";
        if (!useTokenImage && !isOwnedFromPLayer) {
            if (tokenDocumentData?.img) {
                imgToken = tokenDocumentData.img;
            }
            if ((!imgToken || ChatPortrait.isWildcardImage(imgToken)) && tokenDocumentData?.texture.src) {
                imgToken = tokenDocumentData?.texture.src;
            }
            if (imgToken &&
                !ChatPortrait.isWildcardImage(imgToken) &&
                !imgToken.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgToken;
            }
        }
        // END MOD COMBAT TRACKER IF TOKEN IS NOT OWNED
        let imgActor = "";
        if (actor) {
            if ((!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) && useTokenImage) {
                //@ts-ignore
                imgActor = actor?.token?.texture.src;
                if (imgActor && ChatPortrait.isWildcardImage(imgActor)) {
                    imgActor = "";
                }
            }
            if ((!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) && useTokenImage) {
                //@ts-ignore
                imgActor = actor?.token?.texture.src;
                if (imgActor && ChatPortrait.isWildcardImage(imgActor)) {
                    imgActor = "";
                }
            }
            if (!imgActor || imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                imgActor = actor?.img;
            }
            if (imgActor && !imgActor.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
                return imgActor;
            }
        }
        const imgAvatar = ChatPortrait.getUserAvatarImageFromUserID(userID);
        // if (isMonkTokenBarXP(html)) {
        //   return imgAvatar;
        // }else {
        if (imgAvatar && !imgAvatar.includes(CONSTANTS.DEF_TOKEN_IMG_NAME)) {
            return imgAvatar;
        }
        else {
            //warn("No specific avatar player image found it for player '"+ChatPortrait.getUserName(message)+"'");
            return imgAvatar ? imgAvatar : CONSTANTS.INV_UNIDENTIFIED_BOOK;
        }
        // }
        //return  useTokenImage ? <string>actor?.token.texture.src : <string>actor?.img;
        //return useTokenImage ? actor?.token.texture.src : actor.img;
    }
}
ChatPortrait.getActorNameFromSpeaker = function (speaker) {
    const actor = ChatPortrait.getActorFromSpeaker(speaker); //game.actors.get(speaker.actor);
    if (actor) {
        return actor.name;
    }
    return speaker.alias;
};
ChatPortrait.getPrototypeTokenNameFromSpeaker = function (speaker) {
    const actor = ChatPortrait.getActorFromSpeaker(speaker); //game.actors.get(speaker.actor);
    if (actor) {
        //@ts-ignore
        if (actor?.prototypeToken) {
            //@ts-ignore
            return actor?.prototypeToken.name;
        }
        else if (actor.token) {
            return actor.token.name;
        }
    }
    return speaker.alias;
};
ChatPortrait.getTokenNameFromSpeaker = function (speaker) {
    if (speaker.token) {
        const token = ChatPortrait.getTokenFromSpeaker(speaker);
        if (token) {
            return token.name;
        }
    }
    if (speaker.actor) {
        const actor = game.actors?.get(speaker.actor);
        if (actor) {
            //@ts-ignore
            if (actor?.prototypeToken) {
                //@ts-ignore
                return actor?.prototypeToken.name;
            }
            else if (actor.token) {
                return actor.token.name;
            }
            if (actor.hasPlayerOwner) {
                return actor.name;
            }
        }
    }
    if (game.user?.isGM) {
        return speaker.alias;
    }
    return ChatPortrait.settings.displayUnknownPlaceHolderActorName; //'???';
};
ChatPortrait.getTokenFromSpeaker = function (speaker) {
    let token = null;
    if (speaker.token) {
        const sceneSpeaker = speaker.scene ? speaker.scene : game.scenes?.current?.id;
        const scene = game.scenes?.get(sceneSpeaker);
        const tokenSpeaker = scene?.tokens.get(speaker.token);
        token = ChatPortrait._getTokenFromScene(scene?.id, tokenSpeaker?.id);
        if (!token) {
            token = ChatPortrait._getTokenFromId(tokenSpeaker?.id);
        }
        if (!token && speaker.actor) {
            token = ChatPortrait._getTokenFromActor(speaker.actor);
        }
    }
    if (!token) {
        const actor = game.actors?.get(speaker.actor);
        if (actor) {
            //@ts-ignore
            if (actor?.prototypeToken) {
                //@ts-ignore
                token = actor?.prototypeToken;
            }
            else if (actor.token) {
                token = actor.token;
            }
        }
    }
    return !token ? null : token;
};
ChatPortrait.getTokenFromIds = function (sceneID, tokenID, actorID) {
    let tokenDocument = ChatPortrait._getTokenFromScene(sceneID, tokenID);
    if (!tokenDocument) {
        tokenDocument = ChatPortrait._getTokenFromId(tokenID);
    }
    if (!tokenDocument && actorID) {
        tokenDocument = ChatPortrait._getTokenFromActor(actorID);
    }
    return tokenDocument;
};
ChatPortrait._getTokenFromActor = function (actorID) {
    let token = null;
    const scene = game.scenes?.get(game.user?.viewedScene);
    if (scene) {
        const thisSceneToken = scene.tokens.find((tokenTmp) => {
            return (tokenTmp.actor && tokenTmp.actor.id === actorID);
        });
        if (thisSceneToken) {
            token = ChatPortrait._getTokenFromId(thisSceneToken.id);
        }
    }
    return token;
};
ChatPortrait._getTokenFromId = function (tokenId) {
    try {
        return canvas.tokens?.get(tokenId)?.document;
    }
    catch (e) {
        return null;
    }
};
ChatPortrait._getTokenFromScene = function (sceneID, tokenID) {
    const specifiedScene = game.scenes?.get(sceneID);
    if (specifiedScene) {
        //return ChatPortrait.getTokenForScene(specifiedScene, tokenID);
        if (!specifiedScene) {
            return null;
        }
        const tokenDoc = specifiedScene.tokens.find((tokenTmp) => {
            return (tokenTmp.id === tokenID);
        });
        return tokenDoc;
    }
    let foundToken = null;
    game.scenes?.find((sceneTmp) => {
        //foundToken = ChatPortrait.getTokenForScene(scene, tokenID);
        if (!sceneTmp) {
            foundToken = null;
        }
        foundToken = sceneTmp.tokens.find((token) => {
            return token.id === tokenID;
        });
        return !!foundToken;
    });
    return foundToken;
};
// static getTokenForScene = function(scene, tokenID) {
//   if (!scene) {
//     return null;
//   }
//   return scene.tokens.find((token) => {
//     return token.id === tokenID;
//   });
// }
/**
 * Returns a list of selected (or owned, if no token is selected)
 * note: ex getSelectedOrOwnedToken
 */
ChatPortrait.getFirstSelectedToken = function () {
    try {
        canvas;
    }
    catch (e) {
        // Canvas not ready
        return null;
    }
    // Get controlled token
    let token = null;
    const controlled = canvas.tokens?.controlled;
    // Do nothing if multiple tokens are selected
    if (controlled.length && controlled.length > 1) {
        token = controlled[0];
    }
    // If exactly one token is selected, take that
    return token;
};
/**
 * Returns a list of selected (or owned, if no token is selected)
 * note: ex getSelectedOrOwnedToken
 */
ChatPortrait.getFirstPlayerToken = function () {
    try {
        canvas;
    }
    catch (e) {
        // Canvas not ready
        return null;
    }
    // Get controlled token
    let token = ChatPortrait.getFirstSelectedToken();
    if (!token) {
        //if(!controlled.length || controlled.length == 0 ){
        // If no token is selected use the token of the users character
        //@ts-ignore
        token = canvas.tokens.placeables.find((token) => token.id === game.user?.character.id);
        //}
        // If no token is selected use the first owned token of the users character you found and is not GM
        if (!token && !game.user?.isGM) {
            token = canvas.tokens?.ownedTokens[0];
        }
    }
    return token;
};
ChatPortrait.isSpeakerGM = function (message) {
    if (message.user) {
        let user = game.users?.get(message.user);
        if (!user) {
            user = game.users?.get(message?.user?.id);
        }
        if (user) {
            return user.isGM;
        }
        else {
            return false;
        }
    }
    return false;
};
ChatPortrait.isGMFromUserID = function (userID) {
    if (userID) {
        const user = game.users?.get(userID);
        if (user) {
            return user.isGM;
        }
        else {
            return false;
        }
    }
    return false;
};
ChatPortrait.shouldOverrideMessageUnknown = function (message) {
    const speaker = message?.message?.speaker;
    let actor;
    let mytype;
    if (!speaker) {
        actor = game.users?.get(message.user)?.character;
        mytype = actor?.type;
    }
    else if (!speaker.token && !speaker.actor) {
        actor = game.users?.get(message.user)?.character;
        mytype = actor?.type;
    }
    else {
        actor = ChatPortrait.getActorFromSpeaker(speaker);
        mytype = actor?.type;
    }
    const setting = game.settings.get(CONSTANTS.MODULE_NAME, "displayUnknown");
    if (setting !== "none") {
        //const user = game.users.get(message.user);
        let user = game.users?.get(message.user);
        if (!user) {
            user = game.users?.get(message.user.id);
        }
        if (!user) {
            user = game.users?.get(message.document?.user?.id);
        }
        if (user) {
            const isSelf = user.id === game.user?.id;
            const isGM = user.isGM;
            if (setting === "allCards" ||
                (setting === "self" && isSelf) ||
                (setting === "selfAndGM" && (isSelf || isGM)) ||
                (setting === "gm" && isGM) ||
                (setting === "player" && !isGM) ||
                (setting === "onlyNpc" && mytype == "npc" && !isGM)) {
                return true;
            }
        }
        else {
            error("Impossibile to get message user");
        }
    }
    return false;
};
ChatPortrait.shouldOverrideMessageStyling = function (message) {
    const setting = game.settings.get(CONSTANTS.MODULE_NAME, "displaySetting");
    if (setting !== "none") {
        //const user = game.users.get(message.user);
        let user = game.users?.get(message.user);
        if (!user) {
            user = game.users?.get(message.user?.id);
        }
        if (!user) {
            user = game.users?.get(message.document?.user?.id);
        }
        if (user) {
            const isSelf = user.id === game.user?.id;
            const isGM = user.isGM;
            if (setting === "allCards" ||
                (setting === "self" && isSelf) ||
                (setting === "selfAndGM" && (isSelf || isGM)) ||
                (setting === "gm" && isGM) ||
                (setting === "player" && !isGM)) {
                return true;
            }
        }
        else {
            error("Impossible to get message user");
        }
    }
    return false;
};
ChatPortrait.getUserColor = function (message) {
    let user = game.users?.get(message.user);
    if (!user) {
        user = game.users?.get(message.user.id);
        if (user) {
            return user.color;
        }
    }
    return "";
};
ChatPortrait.getUserAvatarImageFromChatMessage = function (message) {
    let userId = "";
    // TODO CHECK THESE FOR FVTT10
    if (message.document?.user?.id) {
        userId = message.document.user.id;
    }
    if (!userId && message.user?.id) {
        userId = message.user.id;
    }
    if (!userId && message.user) {
        userId = message.user;
    }
    if (userId) {
        const user = game.users?.get(userId);
        if (user) {
            if (user && user.avatar) {
                // image path
                return user.avatar;
            }
        }
    }
    return CONSTANTS.DEF_TOKEN_IMG_PATH;
};
ChatPortrait.getUserAvatarImageFromUserID = function (userId) {
    const user = game.users?.get(userId);
    if (user) {
        if (user && user.avatar) {
            // image path
            return user.avatar;
        }
    }
    return CONSTANTS.DEF_TOKEN_IMG_PATH;
};
ChatPortrait.getUserNameFromChatMessage = function (message) {
    let user = game.users?.get(message.user);
    if (!user) {
        user = game.users?.get(message.user.id);
    }
    if (user) {
        if (user && user.avatar) {
            // image path
            return user.name;
        }
    }
    return "";
};
ChatPortrait.getUserNameFromUserID = function (userID) {
    const user = game.users?.get(userID);
    if (user) {
        if (user && user.avatar) {
            // image path
            return user.name;
        }
    }
    return "";
};
ChatPortrait.isWhisperToOther = function (speakerInfo) {
    const whisper = speakerInfo?.message?.whisper;
    return whisper && whisper.length > 0 && whisper.indexOf(game.userId) === -1;
};
ChatPortrait.replaceSenderWithTokenName = function (messageSenderElem, speakerInfo) {
    const speaker = speakerInfo.message.speaker;
    const alias = speaker.alias;
    const actorName = (ChatPortrait.getActorNameFromSpeaker(speaker) || "").trim();
    const prototypeTokenName = (ChatPortrait.getPrototypeTokenNameFromSpeaker(speaker) || "").trim();
    const tokenName = (ChatPortrait.getTokenNameFromSpeaker(speaker) || "").trim();
    debug(`replaceSenderWithTokenName | Alias '${alias}'`);
    debug(`replaceSenderWithTokenName | Actor Name '${actorName}'`);
    debug(`replaceSenderWithTokenName | Prototype Token Name '${prototypeTokenName}'`);
    debug(`replaceSenderWithTokenName | Token Name '${tokenName}'`);
    if (tokenName && tokenName !== alias) {
        debug(`replaceSenderWithTokenName | Use token name replaced '${alias}' with '${tokenName}'`);
        ChatPortrait.replaceMatchingTextNodes(messageSenderElem[0], tokenName, alias);
    }
    // else {
    // 	if (actorName !== name) {
    // 		ChatPortrait.replaceMatchingTextNodes(messageSenderElem[0], actorName, name);
    // 	}
    // }
};
ChatPortrait.replaceMatchingTextNodes = function (parent, match, replacement) {
    if (!parent || !parent.hasChildNodes()) {
        return;
    }
    for (const node of parent.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.wholeText.trim() === match) {
                node.parentNode.replaceChild(document.createTextNode(replacement), node);
            }
        }
        else {
            ChatPortrait.replaceMatchingTextNodes(node, match, replacement);
        }
    }
};
ChatPortrait.appendPlayerName = function (headerTextElement, messageSenderElem, author, gameSystemId) {
    const playerName = author.name;
    const playerNameElem = document.createElement("span");
    playerNameElem.appendChild(document.createTextNode(playerName));
    if (!playerNameElem.classList.contains(`chat-portrait-playerName-${gameSystemId}`)) {
        playerNameElem.classList.add(`chat-portrait-playerName-${gameSystemId}`);
    }
    // messageSenderElem.append(playerNameElem);
    headerTextElement.appendChild(playerNameElem);
};
ChatPortrait.getMessageTypeVisible = function (speakerInfo) {
    let messageType = speakerInfo.message?.type;
    switch (messageType) {
        case CONST.CHAT_MESSAGE_TYPES.OTHER:
            return CONST.CHAT_MESSAGE_TYPES.OTHER;
        case CONST.CHAT_MESSAGE_TYPES.OOC:
            return CONST.CHAT_MESSAGE_TYPES.OOC;
        case CONST.CHAT_MESSAGE_TYPES.IC:
            return CONST.CHAT_MESSAGE_TYPES.IC;
        case CONST.CHAT_MESSAGE_TYPES.EMOTE:
            return CONST.CHAT_MESSAGE_TYPES.EMOTE;
        case CONST.CHAT_MESSAGE_TYPES.WHISPER:
            return CONST.CHAT_MESSAGE_TYPES.WHISPER;
        case CONST.CHAT_MESSAGE_TYPES.ROLL:
            return CONST.CHAT_MESSAGE_TYPES.ROLL;
        default:
            // "Unknown tab
            return;
    }
    //return; // if there is some future new message type, its probably better to default to be visible than to hide it.
};
ChatPortrait.getLogElement = function (chatLog) {
    const el = chatLog.element;
    const log = el.length ? el[0].querySelector("#chat-log") : null;
    return log;
};
ChatPortrait.shouldScrollToBottom = function (log) {
    // If more than half chat log height above the actual bottom, don't do the scroll.
    const propOfClientHeightScrolled = (log.scrollHeight - log.clientHeight - log.scrollTop) / log.clientHeight;
    return propOfClientHeightScrolled <= 0.5;
};
