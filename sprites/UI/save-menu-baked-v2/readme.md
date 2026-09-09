# Baked Save Menu V2

Complete ImageGen save-card artwork: book, frame, SLOT, NEW SAVE, CONTINUE and fixed statistics labels share one source bitmap. The instruction plaques include their text in the original pixels. Dates, slot numbers, saved statistics and mode state remain aligned live values.

Built-in ImageGen mode. Exact prompts and source paths are in prompts.json. Original RGB atlas pixels are preserved; Phaser selects source rectangles and clips each painted frame silhouette to exclude the generated checkerboard gutter. No text is drawn into textures at runtime, no asset stretch, no synthetic alpha conversion. The rejected transparency edit is not used.

Production cards are 290 x 200 logical pixels at a uniform scale below 0.414 (over 2.4 source pixels per logical pixel). Only the two menu atlases are loaded, and both are released by WorldLoad with the other menu art. saveMenuArt=0 retains the legacy presentation rollback. Save behavior is unchanged.
