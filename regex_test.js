
const testCases = [
    "20241701001P00123",        // Perfect
    "2O2417O1OO1POO123",        // O replacing 0
    "2024 1701001 P 00123",     // Spaces
    "2Q241701001P00123",        // Q for 0
    "20241701001P00I23",        // I for 1
    "20241701001P00|23",        // | for 1
    "20241701001P00l23",        // l for 1
    "2O24 17O1OO1 P OO123",     // Spaces + Errors
    "texto basura 20241701001P00123 asd" // Embedded
];

// Current Regex Logic
const analyze = (text) => {
    // Improved Regex proposal:
    // 1. Cleaner: Remove all spaces first? No, acts might be separated by text.
    // 2. Pattern:
    // Year: 2[0-9OQZDB]{3} (Starts with 2, followed by 3 chars that look like digits)
    // Notary: [0-9OQZDB]{7}
    // Letter: [A-Z]
    // Seq: [0-9OQZDBIil|!]{5}

    // Let's try to be flexible with spaces between blocks
    const pattern = /(2[0-9OQZDB]{3})\s*([0-9OQZDB]{7})\s*([A-Z])\s*([0-9OQZDBIil|!]{5})/gi;

    const results = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const full = match[0];
        const year = match[1].replace(/[OQZDB]/gi, (c) => c === 'Z' ? '2' : '0');
        // Note: Z->2, others->0. Q, O, D, B(maybe 8?)

        const notary = match[2].replace(/[OQZDB]/gi, (c) => c === 'Z' ? '2' : '0');
        const letter = match[3];
        const seq = match[4]
            .replace(/[OQZDB]/gi, '0')
            .replace(/[Iil|!]/g, '1'); // l, I, | -> 1

        results.push({
            original: full,
            cleaned: `${year}${notary}${letter}${seq}`
        });
    }
    return results;
};

testCases.forEach(t => {
    console.log(`Input: "${t}"`);
    console.log("Found:", analyze(t));
    console.log("---");
});
