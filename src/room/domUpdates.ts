/** Avoid invalidating style/attributes when a sampled pose has not changed. */
export function updateStyles(element: HTMLElement, values: Partial<CSSStyleDeclaration>) {
  for (const [property, value] of Object.entries(values)) {
    if (typeof value === 'string' && Reflect.get(element.style, property) !== value) Reflect.set(element.style, property, value);
  }
}
export function updateData(element: HTMLElement, values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) if (element.dataset[key] !== value) element.dataset[key] = value;
}
