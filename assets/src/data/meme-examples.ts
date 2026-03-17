type ExampleMap = Record<number, string[]>

export const memeExamples: ExampleMap = {
  181913649: ['Reject', 'Embrace'],
  129242436: ['Button 1', 'Button 2'],
  112126428: ['Current commitment', 'Shiny distraction', 'Ignored', 'Ignoring'],
  93895088: ['Small brain', 'Bigger brain', 'Galaxy brain', 'Ascended'],
  21735: ['One does not simply', 'Walk into Mordor'],
  29617627: ['They do not know I...', '...and I love it'],
  61579: ['Brace yourselves', 'Something is coming'],
  97984: ['Not sure if', 'Or just'],
  4087833: ['Change my mind', ''],
  8072285: ['It is not much', 'But it is honest work'],
  124822590: ['Wait', 'It is all memes', 'Always has been'],
  1035805: ['Y U NO do the thing?!', ''],
  99683372: ['Roll Safe logic', ''],
  135678846: ['Handshake side A', 'Handshake side B', 'Shared thing'],
  178591752: ['Gru plan step 1', 'Step 2', 'Step 3', 'Oh no'],
}

export function getMemeExample(templateId: number, index: number) {
  return memeExamples[templateId]?.[index]
}
