import Rectangle from "../../baseTypes/rectangle";
import Events from "../../events";
import UI from "../../ui/ui";
import UIElement, { UI_ELEMENT_TYPE } from "../../ui/ui-element";
import { GetEntityGraphic } from "../entities/entity-graphics";
import Renderer from "../renderer";

const UI_ELEMENTS = new WeakMap<UIElement, HTMLElement>();
const INITIAL_DISPLAY_VALUES = new WeakMap<UIElement, string>();

export function GetDomForUIElement(uiElement: UIElement) {
    return UI_ELEMENTS.get(uiElement);
}

function ui_loop(screenRect: Rectangle) {

    // TODO: mark 'dirty' to skip this loop if nothing has changed
    for(var element of UIElement.UI_ELEMENTS) {
        redraw(element, screenRect);
    }
}

function initialRender(uiElement: UIElement): HTMLElement {

    const element = document.createElement(uiElement.elementType);
    if(uiElement.elementType == UI_ELEMENT_TYPE.Checkbox) {
        element.setAttribute('type', 'checkbox');
        const labelElement = document.createElement('label');
        element.appendChild(labelElement);
    }

    if(uiElement.customAction) {
        element.addEventListener('click', uiElement.customAction);
    }

    UI_ELEMENTS.set(uiElement, element);
    if(uiElement.parent) {
        const parentElement = UI_ELEMENTS.get(uiElement.parent);
        parentElement.appendChild(element);
    } else {
        UI.CONTAINER.appendChild(element);
    }
    INITIAL_DISPLAY_VALUES.set(uiElement, window.getComputedStyle(element).display);

    uiElementUpdated(uiElement);

    return element;
}

function redraw(uiElement: UIElement, screenRect: Rectangle) {

    if(!UI_ELEMENTS.has(uiElement)) {
        initialRender(uiElement);
    }
    
    const entityGraphic = GetEntityGraphic(uiElement.entity);
    if(entityGraphic) {

        // TODO: get grid size constant
        const gridSize = 32;

        const entityHeight: number = entityGraphic.offsetHeight;
        const offsetPosition = {
            x: uiElement.entity.position.x - screenRect.x,
            y: uiElement.entity.position.y - screenRect.y
        };
        let targetY = gridSize * offsetPosition.y;
        if(entityGraphic?.style?.height) {
            // multiply height for some reason
            targetY -= (1.5 * entityHeight);
        }

        const element = UI_ELEMENTS.get(uiElement);
        element.style.left = (gridSize * offsetPosition.x) + "px";
        element.style.top = targetY + "px";
    }
}

Renderer.RegisterRenderMethod(10, ui_loop);

function uiElementUpdated(uiElement: UIElement) {
    if(!Events.EventHasFired(Events.List.GameStart)) return;
    if(!UI_ELEMENTS.has(uiElement)) return;
    
    const element = UI_ELEMENTS.get(uiElement);
    element.className = uiElement.classes.join(' ');

    if(uiElement.visible) {
        element.style.display = INITIAL_DISPLAY_VALUES.get(uiElement);
    } else {
        element.style.display = "none";
    }

    if(uiElement.text) {
        element.innerHTML = uiElement.text;
    }
}

function UIElementDestroyed(uiElement: UIElement) {
    const element = UI_ELEMENTS.get(uiElement);
    if(element) {
        element.remove();
        UI_ELEMENTS.delete(uiElement);
    } else {
        console.warn(`Couldn't find element to remove for uiElement`, uiElement);
    }
}

Events.Subscribe(Events.List.UIElementUpdated, uiElementUpdated);
Events.Subscribe(Events.List.UIElementDestroyed, UIElementDestroyed);
