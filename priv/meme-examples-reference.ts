type ExampleMap = Record<number, string[]>;

// Lightweight curated examples for popular templates.
export const memeExamples: ExampleMap = {
	181913649: ["Reject", "Embrace"], // Drake Hotline Bling
	129242436: ["Button 1", "Button 2"], // Two Buttons
	112126428: ["Current commitment", "Shiny distraction", "Ignored", "Ignoring"], // Distracted Boyfriend
	93895088: ["Small brain", "Bigger brain", "Galaxy brain", "Ascended"], // Expanding Brain
	21735: ["One does not simply", "Walk into Mordor"], // One Does Not Simply
	29617627: ["They don’t know I...", "...and I love it"], // They Don't Know
	61579: ["Brace yourselves", "Something is coming"], // Ned Stark
	97984: ["Not sure if", "Or just"], // Fry
	4087833: ["Change my mind", ""], // Change My Mind
	8072285: ["It ain’t much", "But it’s honest work"], // Honest Work
	124822590: ["Wait", "It’s all memes", "Always has been"], // Always Has Been
	1035805: ["Y U NO do the thing?!", ""], // Y U NO
	99683372: ["Roll Safe logic", ""], // Roll Safe
	135678846: ["Handshake side A", "Handshake side B", "Shared thing"], // Epic Handshake
	178591752: ["Gru plan step 1", "Step 2", "Step 3", "Oh no"], // Gru’s Plan
};

export const getMemeExample = (
	templateId: number,
	index: number,
): string | undefined => memeExamples[templateId]?.[index];
