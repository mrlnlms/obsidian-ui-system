const MESSAGE = "Obsidian UI System — plugin connected";

async function main(): Promise<void> {
  const font: FontName = { family: "Inter", style: "Regular" };
  await figma.loadFontAsync(font);

  const text = figma.createText();
  text.name = MESSAGE;
  text.fontName = font;
  text.fontSize = 24;
  text.characters = MESSAGE;

  const center = figma.viewport.center;
  text.x = center.x - text.width / 2;
  text.y = center.y - text.height / 2;

  figma.currentPage.selection = [text];
  figma.viewport.scrollAndZoomIntoView([text]);
  figma.closePlugin("Obsidian UI System connected: text node created.");
}

main().catch((error: unknown) => {
  const detail = error instanceof Error ? error.message : String(error);
  figma.closePlugin(`Obsidian UI System failed: ${detail}`);
});
