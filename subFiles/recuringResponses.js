const {randomBytes} = require('node:crypto');
const Uwuifier = require('uwuifier');
var stringSimilarity = require("string-similarity");

const uwuifier = new Uwuifier({
    spaces: {
        faces: 0.2,
        actions: 0.050,
        stutters: 0.1
    },
    words: 1,
    exclamations: 1
});

const checkSimilarStatements = (message) => {
    let distanceMap = new Map();

    for (question in botResponses){
        let distance = stringSimilarity.compareTwoStrings(question, message.toLowerCase());
        
        distanceMap.set(
            botResponses[question],
            distance
        )
    };

    let sortedMap = [...distanceMap.entries()].sort((a, b) => b[1]-a[1]);
    let closest = sortedMap.entries().next().value[1];

    // console.log(closest);

    if (closest[1] > 0.45){
        return uwuifier.uwuifySentence(closest[0])
    } 
};

module.exports = checkSimilarStatements