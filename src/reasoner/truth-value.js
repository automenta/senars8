function deduceTruthValue(tv1, tv2) {
    const frequency = tv1.frequency * tv2.frequency;
    const confidence = tv1.confidence * tv2.confidence * 0.9;
    return {frequency, confidence};
}

function induceTruthValue(tv1, tv2) {
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.5;
    return {frequency, confidence};
}

function abduceTruthValue(tv1, tv2) {
    const frequency = (tv1.frequency + tv2.frequency) / 2;
    const confidence = tv1.confidence * tv2.confidence * 0.3;
    return {frequency, confidence};
}

function analogizeTruthValue(tv1, tv2, tv3) {
    const frequency = (tv1.frequency + tv2.frequency + tv3.frequency) / 3;
    const confidence = tv1.confidence * tv2.confidence * tv3.confidence * 0.4;
    return {frequency, confidence};
}

module.exports = {
    deduceTruthValue,
    induceTruthValue,
    abduceTruthValue,
    analogizeTruthValue,
};
