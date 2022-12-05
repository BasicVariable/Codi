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
    let distances = {all: [], distance2Answer: {}};

    for (question in botResponses){
        let distance = stringSimilarity.compareTwoStrings(question, message.toLowerCase());
        let randomId = (randomBytes(16).toString('hex')).substring(0,16);

        distances.all.push(`${randomId}${distance}`); 
        distances.distance2Answer[`${randomId}${distance}`] = botResponses[question]
    };

    distances.all.sort((a, b) => parseFloat(b.substring(16))-parseFloat(a.substring(16)));

    // console.log(distances);

    if (parseFloat(distances.all[0].substring(16)) > 0.45){
        return uwuifier.uwuifySentence(distances.distance2Answer[distances.all[0]])
    } 
};

module.exports = checkSimilarStatements